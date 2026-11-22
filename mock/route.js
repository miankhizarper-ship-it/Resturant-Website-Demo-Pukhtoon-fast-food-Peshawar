// Shared routing for the fixture mock server (used by mock/server.js and tests).

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', 'test', 'fixtures');

const HTML = 'text/html; charset=utf-8';

async function load(name) {
  return readFile(join(FIXTURES, name), 'utf8');
}

// Stage-2 response to the stage-1 form POST: no form, only the JS-embedded
// ?lp_go= URL + sc() cookie (the real LinkPilot timer page).
const STAGE2_PAGE = await load('hop-stage2.html');

// File landing page after the lp_go redirect (driveseed.org/file/...):
// "Cloud Download" anchor carries the direct r2.dev zip URL.
const FILE_PAGE = await load('filepage-driveseed.html');

/**
 * @returns {Promise<{body?:string, type:string, status?:number, redirect?:string}>}
 */
export async function route(pathname, search = '', method = 'GET') {
  const p = (pathname || '/').replace(/\/+$/, '') || '/';

  // Stage-1 form POST -> stage-2 (lp_go) page.
  if (method === 'POST') {
    return { body: STAGE2_PAGE, type: HTML };
  }

  // Hop generator entry: /?sid=...
  if (search.includes('sid=')) {
    return { body: await load('hop-stage1.html'), type: HTML };
  }

  // Stage-2 "Go to download": GET /?lp_go=lp-... -> 302 to the file page.
  if (search.includes('lp_go=')) {
    return { redirect: '/file/FOXdH1jTEUHBrZT62tCF', status: 302, type: HTML };
  }

  // File landing page (driveseed.org/file/... in production).
  if (p.startsWith('/file/')) {
    return { body: FILE_PAGE, type: HTML };
  }

  if (p === '/from-chips-to-cloud') {
    return { body: STAGE2_PAGE, type: HTML };
  }

  if (p.startsWith('/search/')) {
    return { body: await load('search-one.html'), type: HTML };
  }

  if (p.startsWith('/movies/hollywood')) {
    return { body: await load('explore-hollywood.html'), type: HTML };
  }

  if (p.startsWith('/download-the-blue-road-season-1-hindi-480p-720p-1080p')) {
    return { body: await load('detail-blue-road.html'), type: HTML };
  }

  // Any archive page on episodes.* replays the episode-list fixture;
  // the single-file flavour (6195) has its own fixture.
  if (p.startsWith('/archives/6195')) {
    return { body: await load('source-links-6195.html'), type: HTML };
  }
  if (p.startsWith('/archives/')) {
    return { body: await load('source-episodes-136380.html'), type: HTML };
  }

  if (p.startsWith('/page/')) {
    return { body: await load('home.html'), type: HTML };
  }

  if (p === '/') {
    return { body: await load('home.html'), type: HTML };
  }

  return { body: `not found: ${pathname}`, type: 'text/plain', status: 404 };
}

export default route;
