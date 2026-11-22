// Unit tests: parse the saved fixtures offline (no network needed).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { parseListing } from '../src/parser/listing.js';
import { parseDetail } from '../src/parser/detail.js';
import { parseSourcePage } from '../src/parser/source.js';
import { parseHopForm, findFinalLink, parseLpGo, looksDirect } from '../src/parser/hop.js';

const FIX = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = (n) => readFile(join(FIX, n), 'utf8');

test('homepage listing', async () => {
  const html = await load('home.html');
  const data = parseListing(html, 'https://moviesmod.fi/');
  assert.ok(data.items.length >= 15, `expected >=15 items, got ${data.items.length}`);
  const first = data.items[0];
  assert.ok(first.title.startsWith('Download '), first.title);
  assert.match(first.url, /^https:\/\/moviesmod\.fi\/download-/);
  assert.ok(first.slug && first.slug.length > 5);
  assert.ok(first.image && /^https:\/\//.test(first.image));
  assert.ok(data.pagination.current === 1);
  assert.ok(data.pagination.pages.length >= 5);
  assert.ok(data.pagination.next);
  // pagination next must point at page 2
  assert.match(data.pagination.next, /\/page\/2\//);
});

test('search listing', async () => {
  const html = await load('search-one.html');
  const data = parseListing(html, 'https://moviesmod.fi/search/one');
  assert.equal(data.heading.type, 'search');
  assert.equal(data.heading.label, 'one');
  assert.ok(data.items.length >= 10);
  assert.ok(data.items.every((i) => i.title && i.url));
  assert.match(data.pagination.next, /\/search\/one\/page\/2\//);
});

test('explore/category listing', async () => {
  const html = await load('explore-hollywood.html');
  const data = parseListing(html, 'https://moviesmod.fi/movies/hollywood/');
  assert.equal(data.heading.type, 'category');
  assert.equal(data.heading.label, 'Hollywood');
  assert.ok(data.items.length >= 10);
  assert.match(data.pagination.next, /\/movies\/hollywood\/page\/2\//);
  assert.ok(data.pagination.pages.some((p) => p.page === 643));
});

test('detail page', async () => {
  const html = await load('detail-blue-road.html');
  const url = 'https://moviesmod.fi/download-the-blue-road-season-1-hindi-480p-720p-1080p/';
  const d = parseDetail(html, url);

  assert.equal(d.slug, 'download-the-blue-road-season-1-hindi-480p-720p-1080p');
  assert.match(d.title, /^Download The Blue Road/);
  assert.ok(d.date, 'date present');
  assert.ok(d.categories.length >= 3, `categories ${d.categories.length}`);
  assert.ok(d.categories.some((c) => c.name === 'Hindi'));
  assert.ok(d.description && d.description.includes('Blue Road'));

  // IMDb box
  assert.ok(d.imdb, 'imdb box');
  assert.equal(d.imdb.title, 'The Blue Road');
  assert.equal(d.imdb.year, '2026');
  assert.equal(d.imdb.rating, '7.8');
  assert.match(d.imdb.imdbUrl, /tt38336631/);

  // Download buttons
  assert.ok(d.buttons.length >= 6, `buttons ${d.buttons.length}`);
  const ep = d.buttons.filter((b) => b.kind === 'episodes' && b.url);
  const batch = d.buttons.filter((b) => b.kind === 'batch' && b.url);
  assert.ok(ep.length >= 3, `episode buttons ${ep.length}`);
  assert.ok(batch.length >= 3, `batch buttons ${batch.length}`);
  assert.ok(ep.every((b) => /^https:\/\/episodes\.modpro\.blog\/archives\//.test(b.url)));
  assert.ok(batch.every((b) => /^https:\/\/episodes\.modpro\.blog\/archives\//.test(b.url)));
  // one disabled button (javascript:void(0))
  assert.ok(d.buttons.some((b) => b.disabled));

  // Groups keyed by quality headings
  assert.ok(d.downloadGroups.length >= 3, `groups ${d.downloadGroups.length}`);
  assert.ok(d.downloadGroups.some((g) => /480p/.test(g.quality || '')));
  assert.ok(d.downloadGroups.some((g) => /1080p/.test(g.quality || '')));

  // Related posts
  assert.ok(d.related.length >= 3);
});

test('source page: episodes list', async () => {
  const html = await load('source-episodes-136380.html');
  const url = 'https://episodes.modpro.blog/archives/136380';
  const s = parseSourcePage(html, url);
  assert.match(s.title, /Blue Road/i);
  assert.ok(s.links.length >= 8, `links ${s.links.length}`);
  const eps = s.links.filter((l) => /^Episode \d+/i.test(l.label));
  assert.ok(eps.length >= 8, `episodes ${eps.length}`);
  assert.ok(eps.every((l) => /^https:\/\/en\.thenaukriadda\.in\/\?sid=/.test(l.url)));
  const batch = s.links.find((l) => /All Episodes Batch/i.test(l.label));
  assert.ok(batch, 'batch link present');
});

test('source page: server buttons (links.modpro)', async () => {
  const html = await load('source-links-6195.html');
  const url = 'https://links.modpro.blog/archives/6195';
  const s = parseSourcePage(html, url);
  assert.match(s.title, /Criminal/i);
  assert.ok(s.links.length >= 4, `links ${s.links.length}`);
  const labels = s.links.map((l) => l.label).join(' | ');
  assert.match(labels, /Fast Server/i);
  assert.match(labels, /Google Drive/i);
  assert.match(labels, /G-Direct/i);
  assert.match(labels, /OneDrive/i);
  assert.match(labels, /Other Download/i);
  const gdirect = s.links.find((l) => /gdrivepro\.xyz/.test(l.url));
  assert.ok(gdirect, 'gdrivepro link');
  const other = s.links.find((l) => /urlflix\.xyz/.test(l.url));
  assert.ok(other, 'urlflix link');
});

test('hop page form extraction', async () => {
  const html = await load('hop-stage1.html');
  const form = parseHopForm(html);
  assert.ok(form, 'form found');
  assert.equal(form.action, 'https://en.thenaukriadda.in/from-chips-to-cloud/');
  assert.ok(form.fields._lp_http2, '_lp_http2');
  assert.ok(form.fields._lp_token, '_lp_token');
  assert.ok(form.fields._lp_chain, '_lp_chain');
  assert.equal(form.fields._lp_hop_index, '1');
  assert.equal(form.stage, 'lp-s1-form');
  assert.equal(form.timerSeconds, 10);
});

test('findFinalLink picks download-ish anchors', () => {
  const html = `<html><body>
    <a href="https://en.thenaukriadda.in/?sid=x">skip me</a>
    <a class="lp-btn" href="https://drive.google.com/uc?id=abc&export=download">Download</a>
  </body></html>`;
  const link = findFinalLink(html, 'https://en.thenaukriadda.in/from-chips-to-cloud/');
  assert.equal(link, 'https://drive.google.com/uc?id=abc&export=download');
});

test('stage-2 has no hop form but exposes lp_go URL + cookie', async () => {
  const html = await load('hop-stage2.html');
  // No form to POST — this was the 'No further hop form' failure.
  assert.equal(parseHopForm(html), null);
  const lp = parseLpGo(html);
  assert.ok(lp, 'lp_go extracted');
  assert.equal(lp.url, 'https://en.thenaukriadda.in/?lp_go=lp-6b02c58d27e2b');
  assert.ok(lp.cookie, 'companion cookie extracted');
  assert.equal(lp.cookie.name, 'lp-6b02c58d27e2b');
  assert.ok(lp.cookie.value.length > 100, 'cookie value present');
  assert.ok(!lp.cookie.value.includes('\\'), 'cookie value unescaped');
  assert.equal(parseLpGo(await load('hop-stage1.html')), null, 'stage-1 has no lp_go');
});

test('file landing page resolves to direct r2.dev file link', async () => {
  const html = await load('filepage-driveseed.html');
  const link = findFinalLink(html, 'https://driveseed.org/file/FOXdH1jTEUHBrZT62tCF');
  assert.ok(link, 'download anchor found');
  assert.match(link, /^https:\/\/pub-.*\.r2\.dev\/.*\.zip$/);
  assert.ok(looksDirect(link), 'r2.dev zip is direct');
  assert.ok(!looksDirect('https://driveseed.org/file/FOXdH1jTEUHBrZT62tCF'), 'landing page is not direct');
  assert.ok(looksDirect('https://drive.google.com/uc?id=abc&export=download'), 'google drive is direct');
});

test('menu links fixture exposes explore paths', async () => {
  const html = await load('menu-links.html');
  const data = parseListing(html, 'https://moviesmod.fi/movies/');
  // menu file has no cards; just ensure it parses without throwing
  assert.ok(Array.isArray(data.items));
  assert.ok(/movies\/hollywood/.test(html));
  assert.ok(/quality\/720p/.test(html));
});
