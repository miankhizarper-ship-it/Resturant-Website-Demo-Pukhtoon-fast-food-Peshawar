// End-to-end test: starts the fixture mock server, points the scraper at it,
// and exercises every API route through the shared router.

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { handleRequest } from '../src/router.js';

const FIX = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const { route } = await import('../mock/route.js');

let server;
let mockOrigin;
const env = {};

test.before(async () => {
  server = http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url, 'http://x');
      const result = await route(u.pathname, u.search, req.method);
      if (result.redirect) {
        res.writeHead(result.status || 302, { location: result.redirect });
        res.end();
        return;
      }
      res.writeHead(result.status || 200, { 'content-type': result.type });
      res.end(result.body);
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(String(err.message));
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  mockOrigin = `http://127.0.0.1:${server.address().port}`;
  env.SCRAPER_MOCK_ORIGIN = mockOrigin;
});

test.after(() => {
  server.close();
});

async function get(path) {
  const res = await handleRequest(
    new Request(`http://api.test${path}`),
    env
  );
  const body = await res.json();
  return { status: res.status, body };
}

test('e2e /api/home', async () => {
  const { status, body } = await get('/api/home');
  assert.equal(status, 200);
  assert.equal(body.type, 'home');
  assert.ok(body.items.length >= 15);
  assert.ok(body.items[0].title.startsWith('Download '));
});

test('e2e /api/search', async () => {
  const { status, body } = await get('/api/search?q=one');
  assert.equal(status, 200);
  assert.equal(body.type, 'search');
  assert.equal(body.heading.label, 'one');
  assert.ok(body.items.length >= 10);
});

test('e2e /api/explore', async () => {
  const { status, body } = await get('/api/explore?path=/movies/hollywood/');
  assert.equal(status, 200);
  assert.equal(body.type, 'explore');
  assert.equal(body.heading.label, 'Hollywood');
  assert.ok(body.items.length >= 10);
});

test('e2e /api/detail', async () => {
  const { status, body } = await get(
    '/api/detail?id=download-the-blue-road-season-1-hindi-480p-720p-1080p'
  );
  assert.equal(status, 200);
  assert.equal(body.type, 'detail');
  assert.match(body.title, /Blue Road/);
  assert.ok(body.buttons.length >= 6);
  assert.ok(body.imdb.rating === '7.8');
});

test('e2e /api/source (episodes)', async () => {
  const { status, body } = await get(
    '/api/source?url=' +
      encodeURIComponent('https://episodes.modpro.blog/archives/136380')
  );
  assert.equal(status, 200);
  assert.equal(body.type, 'source');
  assert.ok(body.links.filter((l) => /^Episode/.test(l.label)).length >= 8);
});

test('e2e /api/source rejects foreign hosts', async () => {
  const { status } = await get(
    '/api/source?url=' + encodeURIComponent('https://evil.example.com/x')
  );
  assert.equal(status, 400);
});

test('e2e /api/generate follows hop to final link', async () => {
  const { status, body } = await get(
    '/api/generate?url=' +
      encodeURIComponent('https://en.thenaukriadda.in/?sid=TESTSID')
  );
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(body.type, 'generate');
  // Full LinkPilot chain: stage1 form POST -> stage2 lp_go GET -> 302 ->
  // driveseed landing page -> direct r2.dev zip.
  assert.match(body.downloadUrl, /^https:\/\/pub-.*\.r2\.dev\/.*\.zip$/);
  assert.ok(body.hops.length >= 4, `hops ${JSON.stringify(body.hops)}`);
  const statuses = body.hops.map((h) => h.status);
  assert.ok(statuses.includes('lp-go'), 'lp_go hop recorded');
  const lpHop = body.hops.find((h) => h.status === 'lp-go');
  assert.equal(lpHop.cookie, 'lp-6b02c58d27e2b', 'cookie name recorded');
});

test('e2e /api/detail?source=1 returns sources too', async () => {
  const { status, body } = await get(
    '/api/detail?id=download-the-blue-road-season-1-hindi-480p-720p-1080p&source=1'
  );
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.sources));
  assert.ok(body.sources.length >= 3, `sources ${body.sources.length}`);
  assert.ok(body.sources[0].links.length >= 8);
});

test('e2e index page', async () => {
  const res = await handleRequest(new Request('http://api.test/'), env);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /MoviesMod Scraper API/);
});

test('e2e 404 for unknown route', async () => {
  const { status } = await get('/api/nope');
  assert.equal(status, 404);
});
