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

const FINAL_PAGE = `<!doctype html><html><head><title>Final</title></head><body>
<div id="lp-stage2">
<a class="download-btn" href="https://drive.google.com/uc?id=MOCKFILE123&export=download">Download Now</a>
</div></body></html>`;

/**
 * @returns {Promise<{body:string, type:string, status?:number}>}
 */
export async function route(pathname, search = '', method = 'GET') {
  const p = (pathname || '/').replace(/\/+$/, '') || '/';

  if (method === 'POST') {
    return { body: FINAL_PAGE, type: HTML };
  }

  // Hop generator entry: /?sid=...
  if (search.includes('sid=')) {
    return { body: await load('hop-stage1.html'), type: HTML };
  }

  if (p === '/from-chips-to-cloud') {
    return { body: FINAL_PAGE, type: HTML };
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
