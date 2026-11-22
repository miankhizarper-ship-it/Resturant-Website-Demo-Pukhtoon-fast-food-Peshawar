// Cloudflare Worker entry point (ready for deployment later).
// Deploy with: npx wrangler deploy   (after `npm i -D wrangler`)

import { handleRequest } from './router.js';

export default {
  async fetch(request, env, ctx) {
    // In production leave SCRAPER_MOCK_ORIGIN unset/empty.
    return handleRequest(request, env || {});
  },
};
