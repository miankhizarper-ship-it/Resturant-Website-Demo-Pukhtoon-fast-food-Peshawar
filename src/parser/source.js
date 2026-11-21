// Parses the download-source pages hosted on modpro.blog:
//   1) episodes.modpro.blog/archives/{id}  -> per-episode links (sid links)
//   2) links.modpro.blog/archives/{id}     -> server buttons (maxbuttons)
// Both ultimately point at en.thenaukriadda.in/?sid=... (the hop generator)
// or directly at gdrivepro.xyz / urlflix.xyz.

import { decodeEntities, stripTags, getAttr } from './html.js';

// Require whitespace after `<a` so JS fragments like `0<a.width&&...`
// inside <script> blocks never match as anchors.
const ANCHOR_RE = /<a\s([^>]*)>([\s\S]*?)<\/a>/gi;

/** Extract every anchor with its attributes from an HTML fragment. */
function anchors(html) {
  // Scripts/styles can contain pseudo-markup that confuses the regex.
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const out = [];
  ANCHOR_RE.lastIndex = 0;
  let m;
  while ((m = ANCHOR_RE.exec(clean)) !== null) {
    const attrs = m[1];
    const href = getAttr(`<a ${attrs}>`, 'href');
    if (!href) continue;
    out.push({
      href: decodeEntities(href),
      text: stripTags(m[2]),
      tag: `<a ${attrs}>`,
      index: m.index,
    });
  }
  return out;
}

function classify(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'en.thenaukriadda.in') return 'hop';
    if (u.hostname === 'gdrivepro.xyz') return 'g-direct';
    if (u.hostname === 'urlflix.xyz') return 'other';
    return 'external';
  } catch {
    return 'invalid';
  }
}

function buttonKind(className) {
  const cls = (className || '').toLowerCase();
  if (cls.includes('episode-links')) return 'episodes';
  if (cls.includes('batch-zip')) return 'batch';
  if (cls.includes('fast-server')) return 'fast-server';
  if (cls.includes('google-drive-server')) return 'gdrive-server';
  if (cls.includes('g-direct')) return 'g-direct';
  if (cls.includes('onedrive')) return 'onedrive';
  if (cls.includes('other-download')) return 'other';
  if (cls.includes('buttonred')) return 'batch';
  return 'other';
}

/**
 * Entry point. Detects which flavour of source page we got:
 * - episode list (h3 > a with "Episode N" / "All Episodes Batch")
 * - server buttons (maxbutton-*)
 *
 * @param {string} html
 * @param {string} pageUrl
 */
export function parseSourcePage(html, pageUrl) {
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  // WordPress prints two <title> tags on this theme; prefer the second (post title).
  const titles = [...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)];
  const postTitle = titles.length > 1
    ? stripTags(titles[1][1]).replace(/\s*[–-]\s*Episodes\.ModPro\.Blog\s*$/i, '').replace(/\s*[–-]\s*Links\.ModPro\.Blog\s*$/i, '')
    : titleMatch ? stripTags(titleMatch[1]) : null;

  const bodyStart = html.indexOf('<div class=entry-content>')
  !== -1
    ? html.indexOf('<div class=entry-content>')
    : html.indexOf('<div class="entry-content">');
  const body = bodyStart !== -1 ? html.slice(bodyStart, bodyStart + 60000) : html;

  const links = [];
  const seen = new Set();
  for (const a of anchors(body)) {
    if (!/^https?:\/\//i.test(a.href)) continue;
    const kind = classify(a.href);
    // Skip navigation / feeds / wp-json etc.
    if (
      /wp-json|xmlrpc|\/feed|comments|oembed|gmpg\.org|templatelens|imgur\.com\/$|i\.imgur/i.test(
        a.href
      )
    )
      continue;
    if (kind === 'external' && !/gdrivepro|urlflix|thenaukriadda/i.test(a.href))
      continue;

    const clsMatch = a.tag.match(/\bclass="([^"]*)"/i);
    const cls = clsMatch ? clsMatch[1] : '';
    const titleAttr = getAttr(a.tag, 'title');

    const label =
      a.text ||
      decodeEntities(titleAttr || '') ||
      null;
    if (!label) continue;

    const key = a.href;
    if (seen.has(key)) continue;
    seen.add(key);

    links.push({
      label: decodeEntities(label),
      url: a.href,
      kind: /maxbutton/i.test(cls) ? buttonKind(cls) : kind,
      external: !/modpro\.blog/i.test(a.href),
    });
  }

  // Split episode links vs server buttons for convenience.
  const episodes = links.filter(
    (l) => /episode\s*\d+/i.test(l.label) || /all episodes batch/i.test(l.label)
  );
  const servers = links.filter((l) => !episodes.includes(l));

  return {
    sourceUrl: pageUrl,
    title: postTitle,
    links,
    episodes,
    servers,
  };
}

export default parseSourcePage;
