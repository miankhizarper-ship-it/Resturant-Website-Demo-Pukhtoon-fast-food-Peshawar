// Localhost development server (Node). Wraps the shared router.
// Run: npm start          -> http://127.0.0.1:8787
// Mock fixtures: SCRAPER_MOCK_ORIGIN=http://127.0.0.1:9081 npm start

import http from 'node:http';
import { handleRequest } from './router.js';

const PORT = Number(process.env.PORT || 8787);

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `127.0.0.1:${PORT}`;
    const request = new Request(`http://${host}${req.url}`, {
      method: req.method,
      headers: req.headers,
    });
    const env = {
      ...process.env,
      SCRAPER_MOCK_ORIGIN: process.env.SCRAPER_MOCK_ORIGIN || '',
    };
    const response = await handleRequest(request, env);
    const headers = {};
    response.headers.forEach((v, k) => {
      headers[k] = v;
    });
    res.writeHead(response.status, headers);
    const buf = Buffer.from(await response.arrayBuffer());
    res.end(buf);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const mock = process.env.SCRAPER_MOCK_ORIGIN
    ? `\n  mock origin : ${process.env.SCRAPER_MOCK_ORIGIN}`
    : '\n  (live mode - set SCRAPER_MOCK_ORIGIN to use local fixtures)';
  console.log(`MoviesMod scraper listening on http://127.0.0.1:${PORT}${mock}`);
});
