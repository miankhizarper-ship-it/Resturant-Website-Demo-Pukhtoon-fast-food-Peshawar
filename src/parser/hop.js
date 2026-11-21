// Parses the en.thenaukriadda.in "link generator" hop page.
//
// Flow observed in the saved source:
//   GET  https://en.thenaukriadda.in/?sid=<b64>
//        -> page with #lp-stage1, a 10s timer and a hidden form
//           (#lp-s1-form) POSTing to /from-chips-to-cloud/ with fields:
//           _lp_http2, _lp_token, _lp_chain, _lp_hop_index
//   POST the form -> next hop page (more stages) -> ... -> final download URL.
//
// The parser extracts the form so the resolver can follow the chain.

import { decodeEntities, stripTags, getAttr } from './html.js';

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
    const isFileHost =
      /drive\.google\.com|drive\.usercontent\.google\.com|dropbox\.com|mega\.nz|mediafire\.com|gofile\.io|pixeldrain|1fichier|file\.io|workupload|terabox|gdrivepro|urlflix/i.test(
        href
      );
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

export default parseHopForm;
