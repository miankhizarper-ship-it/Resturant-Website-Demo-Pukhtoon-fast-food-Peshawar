// Starts mock fixture server + scraper API together for localhost testing.
// Run: npm run dev

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MOCK_PORT = process.env.MOCK_PORT || 9081;
const API_PORT = process.env.PORT || 8787;

const mock = spawn(process.execPath, [join(ROOT, 'mock', 'server.js')], {
  env: { ...process.env, MOCK_PORT: String(MOCK_PORT) },
  stdio: ['ignore', 'inherit', 'inherit'],
});

const api = spawn(process.execPath, [join(ROOT, 'src', 'server.js')], {
  env: {
    ...process.env,
    PORT: String(API_PORT),
    SCRAPER_MOCK_ORIGIN: `http://127.0.0.1:${MOCK_PORT}`,
  },
  stdio: ['ignore', 'inherit', 'inherit'],
});

function shutdown() {
  mock.kill('SIGTERM');
  api.kill('SIGTERM');
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`
--------------------------------------------------
  Mock fixtures : http://127.0.0.1:${MOCK_PORT}
  Scraper API   : http://127.0.0.1:${API_PORT}
  Try:
    curl "http://127.0.0.1:${API_PORT}/api/home"
    curl "http://127.0.0.1:${API_PORT}/api/search?q=one"
    curl "http://127.0.0.1:${API_PORT}/api/explore?path=/movies/hollywood/"
    curl "http://127.0.0.1:${API_PORT}/api/detail?id=download-the-blue-road-season-1-hindi-480p-720p-1080p"
--------------------------------------------------
`);
