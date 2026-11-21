// Parses a moviesmod.fi post/detail page:
//   https://moviesmod.fi/download-the-one-about-matthew-perry-season-1-hindi-720p-1080p/
// Extracts title, categories, date, description, IMDb box, download buttons
// (maxbutton -> episodes.modpro.blog / links.modpro.blog) and related posts.

import {
  decodeEntities,
  stripTags,
  getAttr,
  absUrl,
  sliceBetween,
} from './html.js';
import { parseListing } from './listing.js';

const MAXBUTTON_RE =
  /<a\b([^>]*\bclass="[^"]*\bmaxbutton\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi;

function parseMaxButtons(html, baseUrl) {
  const out = [];
  MAXBUTTON_RE.lastIndex = 0;
  let m;
  while ((m = MAXBUTTON_RE.exec(html)) !== null) {
    const attrs = m[1];
    const inner = m[2];
    const href = getAttr(`<a ${attrs}>`, 'href');
    if (!href || href.startsWith('javascript:')) {
      // Disabled button (e.g. javascript:void(0)) - still expose it.
      out.push({
        label: stripTags(inner) || null,
        url: null,
        disabled: true,
        kind: buttonKind(getAttr(`<a ${attrs}>`, 'class') || ''),
      });
      continue;
    }
    const label =
      stripTags(inner) ||
      decodeEntities(getAttr(`<a ${attrs}>`, 'title') || '');
    out.push({
      label: decodeEntities(label),
      url: absUrl(href, baseUrl),
      disabled: false,
      kind: buttonKind(getAttr(`<a ${attrs}>`, 'class') || ''),
    });
  }
  return out;
}

function buttonKind(className) {
  const cls = className.toLowerCase();
  if (cls.includes('episode-links')) return 'episodes';
  if (cls.includes('batch-zip')) return 'batch';
  if (cls.includes('fast-server')) return 'fast-server';
  if (cls.includes('google-drive-server')) return 'gdrive-server';
  if (cls.includes('g-direct')) return 'g-direct';
  if (cls.includes('onedrive')) return 'onedrive';
  if (cls.includes('other-download')) return 'other';
  return 'other';
}

function parseImdb(html) {
  const boxStart = html.indexOf('imdbwp__');
  if (boxStart === -1) return null;
  // Take a window around the first imdbwp marker.
  const window_ = html.slice(
    Math.max(0, html.indexOf('class="imdbwp') - 200),
    html.indexOf('class="imdbwp') + 6000
  );

  const grab = (re) => {
    const m = window_.match(re);
    return m ? stripTags(m[1]) : null;
  };

  const poster = grab(/class="imdbwp__img"[^>]*\bsrc="([^"]+)"/i)
    || grab(/<img[^>]*\bsrc="([^"]+)"[^>]*class="imdbwp__img"/i);
  const title = grab(/class="imdbwp__title">([\s\S]*?)<\/span>/i);
  const year = grab(/class="imdbwp__title">[\s\S]*?<\/span>\s*\((\d{4})\)/i)
    || grab(/\((\d{4})\)<\/p>/i);
  const meta = grab(/class="imdbwp__meta">([\s\S]*?)<\/div>/i);
  const rating = grab(/class="imdbwp__star">([\s\S]*?)<\/span>/i);
  const ratingText = grab(/class="imdbwp__rating">([\s\S]*?)<\/span>/i);
  const teaser = grab(/class="imdbwp__teaser">([\s\S]*?)<\/div>/i);
  const footer = grab(/class="imdbwp__footer">([\s\S]*?)<\/div>/i);

  const metaParts = meta
    ? meta.split('|').map((s) => stripTags(s)).filter(Boolean)
    : [];

  const imdbLink = window_.match(
    /href="(https:\/\/www\.imdb\.com\/title\/tt\d+[^"]*)"/i
  );

  const people = {};
  if (footer) {
    const fm = footer.match(
      /Director:\s*<span>([\s\S]*?)<\/span>[\s\S]*?Creator:\s*<span>([\s\S]*?)<\/span>[\s\S]*?Actors:\s*<span>([\s\S]*?)<\/span>/i
    );
    if (fm) {
      people.director = stripTags(fm[1]);
      people.creator = stripTags(fm[2]);
      people.actors = stripTags(fm[3]);
    } else {
      const dm = footer.match(/Director:\s*<span>([\s\S]*?)<\/span>/i);
      const am = footer.match(/Actors:\s*<span>([\s\S]*?)<\/span>/i);
      if (dm) people.director = stripTags(dm[1]);
      if (am) people.actors = stripTags(am[1]);
    }
  }

  if (!title && !rating) return null;

  return {
    title: title ? decodeEntities(title) : null,
    year: year || null,
    poster: poster || null,
    genres: metaParts[1] || null,
    released: metaParts[2] || null,
    rating: rating || null,
    ratingText: ratingText ? decodeEntities(ratingText) : null,
    teaser: teaser ? decodeEntities(teaser) : null,
    imdbUrl: imdbLink ? decodeEntities(imdbLink[1]) : null,
    ...people,
  };
}

function parseCategories(html) {
  const m = html.match(
    /<div\b[^>]*\bclass="[^"]*\bthecategory\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i
  );
  if (!m) return [];
  const cats = [];
  const re = /<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let a;
  while ((a = re.exec(m[1])) !== null) {
    cats.push({
      name: stripTags(a[2]),
      url: decodeEntities(a[1]),
    });
  }
  return cats;
}

function parseDate(html) {
  const m = html.match(
    /<span\b[^>]*\bclass="[^"]*\bthetime\b[^"]*"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/i
  );
  return m ? stripTags(m[1]) : null;
}

function parseDescription(html) {
  const start = html.indexOf('class="thecontent');
  if (start === -1) return null;
  const window_ = html.slice(start, start + 4000);
  const m = window_.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  return m ? stripTags(m[1]) : null;
}

/**
 * @param {string} html
 * @param {string} pageUrl canonical URL of the detail page
 */
export function parseDetail(html, pageUrl) {
  const titleMatch = html.match(
    /<h1\b[^>]*\bclass="[^"]*\bsingle-title\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i
  );
  const title = titleMatch ? stripTags(titleMatch[1]) : null;

  const contentStart = html.indexOf('id="content_box"');
  const content = contentStart !== -1 ? html.slice(contentStart) : html;

  // Download buttons live inside .thecontent; capture the quality heading
  // that precedes each button so groups stay meaningful.
  const contentWindow = sliceBetween(
    content,
    'class="post-single-content',
    '</div><!--.post-single-content-->'
  ) || content;

  const buttons = parseMaxButtons(contentWindow, pageUrl);

  // Group buttons by nearest preceding <h3> heading.
  const groups = [];
  const events = [];
  const h3re = /<h3\b[^>]*>([\s\S]*?)<\/h3>/gi;
  let m;
  while ((m = h3re.exec(contentWindow)) !== null) {
    events.push({ at: m.index, type: 'h3', text: stripTags(m[1]) });
  }
  MAXBUTTON_RE.lastIndex = 0;
  while ((m = MAXBUTTON_RE.exec(contentWindow)) !== null) {
    events.push({ at: m.index, type: 'btn' });
  }
  events.sort((a, b) => a.at - b.at);

  let currentHeading = null;
  let btnIdx = 0;
  for (const ev of events) {
    if (ev.type === 'h3') {
      // Start a new group when we see a heading that looks like a quality/season line.
      if (/(\d{3,4}p|Season|Episode|Batch|ZIP|GB|MB)/i.test(ev.text)) {
        currentHeading = { quality: ev.text, buttons: [] };
        groups.push(currentHeading);
      }
    } else {
      const btn = buttons[btnIdx++];
      if (!btn) continue;
      if (!currentHeading) {
        currentHeading = { quality: null, buttons: [] };
        groups.push(currentHeading);
      }
      currentHeading.buttons.push(btn);
    }
  }

  // Related posts (inside .related-posts) reuse listing markup.
  const relStart = html.indexOf('class="related-posts"');
  let related = [];
  if (relStart !== -1) {
    const relHtml = html.slice(relStart, relStart + 20000);
    related = parseListing(relHtml, pageUrl).items;
  }

  let slug = null;
  try {
    const parts = new URL(pageUrl).pathname.split('/').filter(Boolean);
    slug = parts.length ? parts[parts.length - 1] : null;
  } catch {
    /* ignore */
  }

  return {
    id: slug,
    slug,
    title,
    url: pageUrl,
    date: parseDate(html),
    categories: parseCategories(content),
    description: parseDescription(content),
    imdb: parseImdb(html),
    downloadGroups: groups.filter((g) => g.buttons.length > 0),
    buttons,
    related,
  };
}

export default parseDetail;
