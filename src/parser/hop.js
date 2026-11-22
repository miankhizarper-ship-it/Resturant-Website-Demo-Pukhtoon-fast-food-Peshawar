// Parses the en.thenaukriadda.in "link generator" hop pages.
//
// Full flow observed in the saved sources (DownloadPageTimerSteps.txt):
//   1. GET  /?sid=<b64>
//        -> #lp-stage1: 10s timer + hidden form (#lp-s1-form) POSTing to an
//           article URL with fields _lp_http2, _lp_token, _lp_chain,
//           _lp_hop_index.  (parseHopForm)
//   2. POST the form -> article page with #lp-stage2: a "Generate link"
//        button + countdown + "Go to download" anchor.  ALL client-side JS —
//        no form.  The target URL and a companion cookie are embedded in the
//        page source:
//          bg.setAttribute('href',"https:\/\/…\/?lp_go=lp-6b02c58d27e2b");
//          sc("lp-6b02c58d27e2b","<b64>",60);
//      (parseLpGo)
//   3. GET /?lp_go=lp-… (with the cookie) -> 302 to a file landing page
//      (e.g. driveseed.org/file/…) whose "Cloud Download" button carries the
//      direct file URL.  (findFinalLink + looksDirect in the resolver)

import { decodeEntities, stripTags, getAttr } from './html.js';

/** Hosts that ARE the final file (no further page to parse). */
export const DIRECT_HOST_RE =
  /drive\.google\.com|drive\.usercontent\.google\.com|dropbox\.com|mega\.nz|mediafire\.com|gofile\.io|pixeldrain|1fichier|file\.io|workupload|terabox|r2\.dev/i;

/** Scoring list: anchors on these hosts are download candidates. */
const FILE_HOST_RE =
  /drive\.google\.com|drive\.usercontent\.google\.com|dropbox\.com|mega\.nz|mediafire\.com|gofile\.io|pixeldrain|1fichier|file\.io|workupload|terabox|gdrivepro|urlflix|r2\.dev/i;

/** True when the URL itself is a direct file link (skip page parsing). */
export function looksDirect(url) {
  if (DIRECT_HOST_RE.test(url)) return true;
  try {
    const p = new URL(url).pathname;
    return /\.(zip|rar|7z|mkv|mp4|avi|mov|exe|iso|pdf|epub|mp3|flac|wav|tgz|gz|tar)$/i.test(p);
  } catch {
    return false;
  }
}

/**
 * Find the next POST form to follow.
 * @returns {{action:string, fields:Object, timerSeconds:number|null, stage:string|null}|null}
 */
export function parseHopForm(html) {
  // Prefer the linkpilot form (id="lp-sN-form"); fall back to any form with _lp_ fields.
  const formRe =
    /<form\b([^>]*\bid="lp-[^"]*"[^>]*)>([\s\S]*?)<\/form>/i;
  let m = html.match(formRe);
  if (!m) {
    const re2 = /<form\b([^>]*)>([\s\S]*?<_lp_[\s\S]*?)<\/form>/i;
    m = html.match(re2);
  }
  // Broader fallback: any form whose body contains _lp_http2
  if (!m) {
    const all = [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)];
    m = all.find((f) => f[2].includes('_lp_http2')) || null;
    if (m) {
      // keep shape: [full, attrs, body]
    }
  }
  if (!m) return null;

  const attrs = m[1] || '';
  const body = m[2] || '';
  const action = getAttr(`<form ${attrs}>`, 'action');
  if (!action) return null;

  const fields = {};
  const inputRe = /<input\b[^>]*>/gi;
  let im;
  while ((im = inputRe.exec(body)) !== null) {
    const name = getAttr(im[0], 'name');
    if (!name) continue;
    const type = (getAttr(im[0], 'type') || 'text').toLowerCase();
    if (type === 'submit' || type === 'button') continue;
    fields[name] = getAttr(im[0], 'value') ?? '';
  }
  if (!Object.keys(fields).some((k) => k.startsWith('_lp_'))) return null;

  const stageId = (attrs.match(/\bid="([^"]+)"/i) || [])[1] || null;

  // Timer is client-side only; server likely does not enforce it, but expose it.
  let timerSeconds = null;
  const timerMatch = html.match(
    /id="lp-timer[^"]*"[^>]*>\s*(\d+)\s*<|var\s+n\s*=\s*(\d+)\s*,\s*el\s*=\s*document\.getElementById\("lp-timer/i
  );
  if (timerMatch) {
    timerSeconds = parseInt(timerMatch[1] || timerMatch[2], 10);
  }

  return {
    action: decodeEntities(action),
    fields,
    timerSeconds,
    stage: stageId,
  };
}

/**
 * Look for a final download link on a hop page (or a meta/JS redirect).
 * @returns {string|null}
 */
export function findFinalLink(html, pageUrl) {
  // 1) meta refresh
  const meta = html.match(
    /<meta[^>]+http-equiv=["']?refresh["']?[^>]*content=["']?\d+\s*;\s*url=([^"'>\s]+)/i
  );
  if (meta) return decodeEntities(meta[1]);

  // 2) explicit "download / get link" style anchors
  const anchorRe =
    /<a\b([^>]*\bhref="([^"]+)"[^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  const candidates = [];
  while ((m = anchorRe.exec(html)) !== null) {
    const href = decodeEntities(m[2]);
    if (!/^https?:\/\//i.test(href)) continue;
    if (/thenaukriadda\.in|modpro\.blog|moviesmod\.fi/i.test(href)) continue;
    const text = stripTags(m[3]);
    const cls = getAttr(`<a ${m[1]}>`, 'class') || '';
    const isDownloadish =
      /download|get\s*link|go\s*to\s*file|fetch|continue|fast\s*server|g-?drive|onedrive/i.test(
        text + ' ' + cls
      );
    const isFileHost = FILE_HOST_RE.test(href);
    if (isDownloadish || isFileHost) {
      candidates.push({ href, text, weight: (isFileHost ? 2 : 0) + (isDownloadish ? 1 : 0) });
    }
  }
  if (candidates.length) {
    candidates.sort((a, b) => b.weight - a.weight);
    return candidates[0].href;
  }

  // 3) JS redirect: location.href = '...'
  const js = html.match(
    /(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/i
  );
  if (js && /^https?:/i.test(js[1])) return js[1];

  return null;
}

/**
 * Stage-2 pages carry no form: the next hop is a `?lp_go=lp-…` URL embedded
 * in JS, plus a companion cookie set by `sc("lp-…","<b64>",60)`.
 * Timers/buttons are pure client-side — the resolver must not wait.
 *
 * Source (saved page, one occurrence per step):
 *   bg.setAttribute('href',"https:\/\/en.thenaukriadda.in\/?lp_go=lp-6b02c58d27e2b");
 *   sc("lp-6b02c58d27e2b","eJwNzEFy…",60);
 *
 * @returns {{url: string, cookie: {name: string, value: string}|null}|null}
 */
export function parseLpGo(html) {
  // 1) next-hop URL (JS string, \/ escaped)
  const urlMatch = html.match(/["'](https?:[^"'<> ]*lp_go=[^"'<> ]+)["']/i);
  if (!urlMatch) return null;
  const url = urlMatch[1].replace(/\\\//g, '/');
  const token = (url.match(/[?&]lp_go=([^&#"']+)/) || [])[1] || null;

  // 2) companion cookie — prefer the one whose name matches the lp_go token
  const cookies = [
    ...html.matchAll(/sc\(\s*["'](lp-[^"']+)["']\s*,\s*["']([^"']+)["']/g),
  ];
  let cm = token ? cookies.find((c) => c[1] === token) : null;
  if (!cm) cm = cookies[0];
  const cookie = cm
    ? { name: cm[1], value: cm[2].replace(/\\\//g, '/') }
    : null;

  return { url, cookie };
}

export default parseHopForm;
