// Core scraper: fetch + parse. Uses global fetch (Node 18+ and Workers).
// No Node-only APIs so the same file runs in a Cloudflare Worker.

import { BASE_URL, mapOrigin, isAllowedUrl, USER_AGENT } from './config.js';
import { parseListing } from './parser/listing.js';
import { parseDetail } from './parser/detail.js';
import { parseSourcePage } from './parser/source.js';
import { parseHopForm, findFinalLink, parseLpGo, looksDirect } from './parser/hop.js';

export class ScraperError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'ScraperError';
    this.status = status;
  }
}

async function fetchText(url, env, { method = 'GET', body = null, headers = {} } = {}) {
  const target = mapOrigin(url, env);
  let res;
  try {
    res = await fetch(target, {
      method,
      redirect: 'follow',
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        ...(body
          ? { 'content-type': 'application/x-www-form-urlencoded' }
          : {}),
        ...headers,
      },
      body: body || undefined,
    });
  } catch (err) {
    throw new ScraperError(`Failed to fetch ${url}: ${err.message}`, 502);
  }
  if (!res.ok) {
    throw new ScraperError(`Upstream ${res.status} for ${url}`, res.status === 404 ? 404 : 502);
  }
  const text = await res.text();
  return {
    text,
    target,
    finalUrl: res.url || target,
    redirected: Boolean(res.redirected) && (res.url || '') !== target,
    status: res.status,
  };
}

/** Build a page URL on moviesmod.fi. */
export function buildUrl(path, page = 1, env = {}) {
  const base = env.SCRAPER_BASE_URL || BASE_URL;
  let p = path.startsWith('/') ? path : `/${path}`;
  if (!p.endsWith('/')) p += '/';
  if (page > 1) p += `page/${page}/`;
  return `${base}${p}`;
}

/** GET /api/home?page=N */
export async function scrapeHome(page = 1, env = {}) {
  const url = page > 1 ? buildUrl('/page/', page, env) : buildUrl('/', 1, env);
  // buildUrl('/', page) -> "/page/N/" is wrong for homepage; fix:
  const finalUrl =
    page > 1
      ? `${env.SCRAPER_BASE_URL || BASE_URL}/page/${page}/`
      : `${env.SCRAPER_BASE_URL || BASE_URL}/`;
  const { text } = await fetchText(finalUrl, env);
  const data = parseListing(text, finalUrl);
  return { type: 'home', page, ...data };
}

/** GET /api/search?q=one&page=N */
export async function scrapeSearch(query, page = 1, env = {}) {
  if (!query) throw new ScraperError('Missing query (q)', 400);
  const base = env.SCRAPER_BASE_URL || BASE_URL;
  let url = `${base}/search/${encodeURIComponent(query)}/`;
  if (page > 1) url += `page/${page}/`;
  const { text } = await fetchText(url, env);
  const data = parseListing(text, url);
  return { type: 'search', query, page, ...data };
}

/**
 * GET /api/explore?path=/movies/hollywood/&page=N
 * path must be an internal moviesmod path (or full URL on the same host).
 */
export async function scrapeExplore(path, page = 1, env = {}) {
  if (!path) throw new ScraperError('Missing path', 400);
  const base = env.SCRAPER_BASE_URL || BASE_URL;
  let url;
  try {
    const u = new URL(path, base);
    const allowed = new URL(base);
    if (u.origin !== allowed.origin) {
      throw new ScraperError('Only internal paths are allowed', 400);
    }
    let p = u.pathname;
    if (!p.endsWith('/')) p += '/';
    if (page > 1) p += `page/${page}/`;
    url = `${u.origin}${p}${u.search}`;
  } catch (e) {
    if (e instanceof ScraperError) throw e;
    throw new ScraperError('Invalid path', 400);
  }
  const { text } = await fetchText(url, env);
  const data = parseListing(text, url);
  return { type: 'explore', path, page, url, ...data };
}

/** GET /api/detail?id=slug  (id = segment after base URL) */
export async function scrapeDetail(id, env = {}) {
  if (!id) throw new ScraperError('Missing id', 400);
  const slug = String(id).replace(/^https?:\/\/[^/]+\//, '').replace(/^\/+|\/+$/g, '');
  if (!slug || /[/?#]/.test(slug)) throw new ScraperError('Invalid id', 400);
  const base = env.SCRAPER_BASE_URL || BASE_URL;
  const url = `${base}/${slug}/`;
  const { text } = await fetchText(url, env);
  return { type: 'detail', ...parseDetail(text, url) };
}

/** GET /api/source?url=<episodes|links.modpro.blog/archives/...> */
export async function scrapeSource(url, env = {}) {
  if (!url) throw new ScraperError('Missing url', 400);
  if (!isAllowedUrl(url, env)) {
    throw new ScraperError('URL host not allowed', 400);
  }
  const { text, finalUrl } = await fetchText(url, env);
  return { type: 'source', ...parseSourcePage(text, finalUrl) };
}

/**
 * Follow the en.thenaukriadda.in hop chain until a final download URL appears.
 * GET /api/generate?url=<hop url>
 *
 * Chain (from saved LinkPilot sources):
 *   GET /?sid=…        -> stage-1 form (timer page)      [parseHopForm]
 *   POST the form      -> stage-2 page, no form; next hop is an embedded
 *                         `?lp_go=lp-…` URL + `sc("lp-…", cookie, 60)`
 *                         (timers are client-side — never wait) [parseLpGo]
 *   GET /?lp_go=…      -> 302 to a file landing page (driveseed.org/file/…)
 *                         whose "Cloud Download" button is the direct file.
 */
export async function generateDownloadLink(url, env = {}) {
  if (!url) throw new ScraperError('Missing url', 400);
  if (!isAllowedUrl(url, env)) {
    throw new ScraperError('URL host not allowed', 400);
  }
  const maxHops = Number(env.SCRAPER_MAX_HOPS || 8);
  const hops = [];
  const cookies = {}; // LinkPilot cookie jar (name -> value), hop-site only
  let current = url;
  let method = 'GET';
  let body = null;
  let referer = null;

  for (let i = 0; i < maxHops; i++) {
    // Attach the stage-2 cookie + referer to hop-site requests only.
    const headers = {};
    try {
      if (/thenaukriadda\.in$/i.test(new URL(current).hostname)) {
        const cookieHeader = Object.entries(cookies)
          .map(([k, v]) => `${k}=${v}`)
          .join('; ');
        if (cookieHeader) headers.cookie = cookieHeader;
        if (referer) headers.referer = referer;
      }
    } catch {
      /* ignore */
    }

    const { text, finalUrl, redirected } = await fetchText(current, env, {
      method,
      body,
      headers,
    });
    hops.push({ step: i + 1, url: current, method, status: 'fetched' });

    // If fetch followed a redirect off the hop site, that destination is the
    // end of the chain — unless the landing page carries a better (direct)
    // file link, e.g. driveseed.org "Cloud Download" -> r2.dev zip.
    if (redirected) {
      try {
        const fu = new URL(finalUrl);
        const onHopSite = /thenaukriadda\.in|modpro\.blog|moviesmod\.fi/i.test(
          fu.hostname
        );
        const onMock =
          env.SCRAPER_MOCK_ORIGIN && finalUrl.startsWith(env.SCRAPER_MOCK_ORIGIN);
        if (!onHopSite && !onMock) {
          if (looksDirect(finalUrl)) {
            hops.push({ step: i + 1, url: finalUrl, method: 'redirect', status: 'final' });
            return { type: 'generate', downloadUrl: finalUrl, hops, hopsUsed: i + 1 };
          }
          const direct = findFinalLink(text, finalUrl);
          if (direct) {
            const abs = new URL(direct, finalUrl).toString();
            if (!isSamePage(abs, finalUrl)) {
              hops.push({ step: i + 1, url: abs, method: 'found', status: 'final' });
              return { type: 'generate', downloadUrl: abs, hops, hopsUsed: i + 1 };
            }
          }
          hops.push({ step: i + 1, url: finalUrl, method: 'redirect', status: 'final' });
          return { type: 'generate', downloadUrl: finalUrl, hops, hopsUsed: i + 1 };
        }
      } catch {
        /* ignore */
      }
    }

    const final = findFinalLink(text, finalUrl);
    if (final) {
      const abs = new URL(final, finalUrl).toString();
      hops.push({ step: i + 1, url: abs, method: 'found', status: 'final' });
      return { type: 'generate', downloadUrl: abs, hops, hopsUsed: i + 1 };
    }

    const form = parseHopForm(text);
    if (form) {
      // Optional client-side timer wait (default off for speed; env-tunable).
      const waitSec = Number(env.SCRAPER_HOP_WAIT ?? 0);
      if (waitSec > 0 && form.timerSeconds) {
        await new Promise((r) => setTimeout(r, Math.min(waitSec, 30) * 1000));
      }

      const actionAbs = new URL(form.action, finalUrl).toString();
      hops.push({
        step: i + 1,
        url: actionAbs,
        method: 'POST',
        status: 'hop',
        fields: Object.keys(form.fields),
        stage: form.stage,
      });
      referer = finalUrl;
      current = actionAbs;
      method = 'POST';
      body = new URLSearchParams(form.fields).toString();
      continue;
    }

    // Stage-2: no form — next hop is the embedded ?lp_go= URL (+ cookie).
    const lpGo = parseLpGo(text);
    if (lpGo && isAllowedUrl(lpGo.url, env)) {
      if (lpGo.cookie) cookies[lpGo.cookie.name] = lpGo.cookie.value;
      const next = new URL(lpGo.url, finalUrl).toString();
      hops.push({
        step: i + 1,
        url: next,
        method: 'GET',
        status: 'lp-go',
        cookie: lpGo.cookie ? lpGo.cookie.name : null,
      });
      referer = finalUrl;
      current = next;
      method = 'GET';
      body = null;
      continue;
    }

    hops.push({ step: i + 1, url: current, method, status: 'no-form' });
    throw new ScraperError('No further hop form or download link found', 502);
  }

  throw new ScraperError(`Max hops (${maxHops}) exceeded`, 502);
}

/** Convenience: detail page + resolve every episode/server link's first hop. */
export async function scrapeDetailWithSource(id, env = {}) {
  const detail = await scrapeDetail(id, env);
  const sources = [];
  const seen = new Set();
  for (const btn of detail.buttons) {
    if (!btn.url || seen.has(btn.url)) continue;
    if (!/modpro\.blog/i.test(btn.url)) continue;
    seen.add(btn.url);
    try {
      sources.push(await scrapeSource(btn.url, env));
    } catch (err) {
      sources.push({ url: btn.url, error: err.message });
    }
  }
  return { ...detail, sources };
}

export default {
  scrapeHome,
  scrapeSearch,
  scrapeExplore,
  scrapeDetail,
  scrapeSource,
  generateDownloadLink,
  scrapeDetailWithSource,
};
