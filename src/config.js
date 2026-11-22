// Central config shared by the local server and the Cloudflare Worker.

export const BASE_URL = 'https://moviesmod.fi';
export const EPISODES_BASE = 'https://episodes.modpro.blog';
export const LINKS_BASE = 'https://links.modpro.blog';
export const HOP_BASE = 'https://en.thenaukriadda.in';

// Hosts we are allowed to fetch (SSRF guard for ?url= endpoints).
export const ALLOWED_HOSTS = new Set([
  'moviesmod.fi',
  'www.moviesmod.fi',
  'episodes.modpro.blog',
  'links.modpro.blog',
  'en.thenaukriadda.in',
  'gdrivepro.xyz',
  'urlflix.xyz',
]);

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * In mock/local-test mode every known target host is rewritten to the local
 * fixture server origin (e.g. http://127.0.0.1:9081). In production (or when
 * SCRAPER_MOCK_ORIGIN is unset) URLs pass through untouched.
 */
export function mapOrigin(rawUrl, env = {}) {
  const mock = env.SCRAPER_MOCK_ORIGIN;
  if (!mock) return rawUrl;
  try {
    const u = new URL(rawUrl);
    const known = [
      'moviesmod.fi',
      'www.moviesmod.fi',
      'episodes.modpro.blog',
      'links.modpro.blog',
      'en.thenaukriadda.in',
    ];
    if (known.includes(u.hostname)) {
      const m = new URL(mock);
      u.protocol = m.protocol;
      u.host = m.host;
    }
    return u.toString();
  } catch {
    return rawUrl;
  }
}

export function isAllowedUrl(rawUrl, env = {}) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (ALLOWED_HOSTS.has(u.hostname)) return true;
  // Local mock origin is allowed only when mock mode is explicitly on.
  const mock = env.SCRAPER_MOCK_ORIGIN;
  if (mock) {
    try {
      const m = new URL(mock);
      if (u.hostname === m.hostname && u.port === m.port) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}
