// Shared request router used by BOTH the local Node server and the
// Cloudflare Worker entry. Keep it free of Node-only APIs.

import {
  scrapeHome,
  scrapeSearch,
  scrapeExplore,
  scrapeDetail,
  scrapeSource,
  generateDownloadLink,
  scrapeDetailWithSource,
  ScraperError,
} from './scraper.js';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS },
  });
}

function htmlResponse(body) {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', ...CORS },
  });
}

function intParam(url, name, fallback = 1) {
  const v = url.searchParams.get(name);
  if (v == null || v === '') return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const INDEX_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>MoviesMod Scraper API</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:system-ui,sans-serif;background:#111;color:#eee;margin:0;padding:2rem}
h1{color:#33bcf2}code{background:#222;padding:2px 6px;border-radius:4px;color:#ffd166}
li{margin:.5rem 0}a{color:#33bcf2}
</style></head><body>
<h1>MoviesMod Scraper API</h1>
<p>Endpoints (all JSON):</p>
<ul>
<li><code>GET /api/home?page=1</code> — homepage listing</li>
<li><code>GET /api/search?q=one&amp;page=1</code> — search results</li>
<li><code>GET /api/explore?path=/movies/hollywood/&amp;page=1</code> — category/explore listing</li>
<li><code>GET /api/detail?id=download-the-one-about-matthew-perry-season-1-hindi-720p-1080p</code> — detail page (id = slug after base /)</li>
<li><code>GET /api/detail?id=...&amp;source=1</code> — detail + its modpro source pages</li>
<li><code>GET /api/source?url=https://episodes.modpro.blog/archives/136380</code> — episode/server links</li>
<li><code>GET /api/generate?url=https://en.thenaukriadda.in/?sid=...</code> — follow hops to final download URL</li>
</ul>
</body></html>`;

/**
 * @param {Request} request
 * @param {object} env  Worker env / process.env-style config
 */
export async function handleRequest(request, env = {}) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(request.url);
  const p = url.pathname.replace(/\/+$/, '') || '/';

  try {
    if (p === '/' || p === '/index.html') {
      return htmlResponse(INDEX_HTML);
    }
    if (p === '/api/home') {
      return json(await scrapeHome(intParam(url, 'page'), env));
    }
    if (p === '/api/search') {
      return json(
        await scrapeSearch(url.searchParams.get('q') || '', intParam(url, 'page'), env)
      );
    }
    if (p === '/api/explore') {
      return json(
        await scrapeExplore(
          url.searchParams.get('path') || '',
          intParam(url, 'page'),
          env
        )
      );
    }
    if (p === '/api/detail') {
      const id = url.searchParams.get('id') || '';
      if (url.searchParams.get('source') === '1') {
        return json(await scrapeDetailWithSource(id, env));
      }
      return json(await scrapeDetail(id, env));
    }
    if (p === '/api/source') {
      return json(await scrapeSource(url.searchParams.get('url') || '', env));
    }
    if (p === '/api/generate') {
      return json(
        await generateDownloadLink(url.searchParams.get('url') || '', env)
      );
    }
    return json({ error: 'Not found', routes: [
      '/api/home', '/api/search', '/api/explore', '/api/detail',
      '/api/source', '/api/generate',
    ] }, 404);
  } catch (err) {
    const status = err instanceof ScraperError ? err.status : 500;
    return json({ error: err.message, status }, status);
  }
}

export default handleRequest;
