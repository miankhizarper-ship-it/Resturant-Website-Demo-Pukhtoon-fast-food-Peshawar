// Local fixture server: replays the saved page sources so the scraper can be
// tested on localhost WITHOUT hitting moviesmod.fi.
//
// Run: npm run mock   -> http://127.0.0.1:9081
// Then: SCRAPER_MOCK_ORIGIN=http://127.0.0.1:9081 npm start
//  or:  npm run dev   (starts both)

import http from 'node:http';
import { route } from './route.js';

const PORT = Number(process.env.MOCK_PORT || 9081);

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const result = await route(u.pathname, u.search, req.method);
    if (result.redirect) {
      res.writeHead(result.status || 302, {
        location: result.redirect,
        'access-control-allow-origin': '*',
      });
      res.end();
      return;
    }
    res.writeHead(result.status || 200, {
      'content-type': result.type,
      'access-control-allow-origin': '*',
    });
    res.end(result.body);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(String(err && err.message));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Fixture mock server on http://127.0.0.1:${PORT}`);
});
