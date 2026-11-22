// Parses listing pages: homepage, search results and explore/category archives.
// All three share the same markup: article.latestPost excerpt cards + pagination.

import { decodeEntities, stripTags, getAttr } from './html.js';

// id is optional: related-post cards omit id="post-N".
const ARTICLE_RE =
  /<article\b([^>]*)>([\s\S]*?)<\/article>/gi;
const LATEST_RE = /\bclass="[^"]*\blatestPost\b[^"]*excerpt[^"]*"/i;
const ID_RE = /\bid="post-(\d+)"/i;
const PAGE_NUM_RE =
  /<a\b[^>]*\bclass="[^"]*\bpage-numbers\b[^"]*"[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
const CURRENT_PAGE_RE =
  /<span[^>]*\bclass="[^"]*\bpage-numbers\s+current\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i;

function parseArticle(attrs, block, baseUrl) {
  if (!LATEST_RE.test(attrs)) return null;

  const linkMatch = block.match(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/i);
  const href = linkMatch ? decodeEntities(linkMatch[1]) : null;

  const titleMatch = block.match(
    /<h2\b[^>]*\bclass="[^"]*front-view-title[^"]*"[^>]*>\s*<a\b[^>]*>([\s\S]*?)<\/a>/i
  );
  const title = titleMatch
    ? stripTags(titleMatch[1])
    : stripTags(getAttr(block, 'title') || '');

  const imgMatch = block.match(/<img\b[^>]*>/i);
  const img = imgMatch ? getAttr(imgMatch[0], 'src') : null;

  const idMatch = attrs.match(ID_RE);
  const id = idMatch ? idMatch[1] : null;

  const dateMatch = block.match(
    /<span\b[^>]*\bclass="[^"]*\bthetime\b[^"]*"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/i
  );
  const date = dateMatch ? stripTags(dateMatch[1]) : null;

  if (!href && !title) return null;

  // id (slug) = path segment after the base host, e.g.
  // https://moviesmod.fi/download-xyz/ -> "download-xyz"
  let slug = null;
  try {
    const u = new URL(href || '', baseUrl);
    const parts = u.pathname.split('/').filter(Boolean);
    slug = parts.length ? parts[parts.length - 1] : null;
  } catch {
    /* ignore */
  }

  return {
    id,
    slug,
    title: decodeEntities(title),
    url: href,
    image: img,
    date,
  };
}

function parsePagination(html) {
  const currentMatch = html.match(CURRENT_PAGE_RE);
  const current = currentMatch ? parseInt(stripTags(currentMatch[1]), 10) : null;

  const pages = [];
  const seen = new Set();
  let m;
  PAGE_NUM_RE.lastIndex = 0;
  while ((m = PAGE_NUM_RE.exec(html)) !== null) {
    const url = decodeEntities(m[1]);
    const label = stripTags(m[2]);
    if (!label || label.toLowerCase() === 'next' || label === '…') continue;
    const n = parseInt(label.replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(n) || seen.has(n)) continue;
    seen.add(n);
    pages.push({ page: n, url });
  }
  pages.sort((a, b) => a.page - b.page);

  const nextMatch = html.match(
    /<a\b[^>]*\bclass="[^"]*\bnext\b[^"]*page-numbers[^"]*"[^>]*\bhref="([^"]+)"/i
  );

  return {
    current,
    pages,
    next: nextMatch ? decodeEntities(nextMatch[1]) : null,
  };
}

function parseHeading(html) {
  const m = html.match(/<h1\b[^>]*\bclass="[^"]*\bpostsby\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return null;
  const text = stripTags(m[1]);
  // "Search Results for: one" | "Category: Hollywood"
  const search = text.match(/Search Results for:\s*(.*)/i);
  if (search) return { type: 'search', label: search[1].trim() };
  const cat = text.match(/Category:\s*(.*)/i);
  if (cat) return { type: 'category', label: cat[1].trim() };
  return { type: 'listing', label: text };
}

/**
 * @param {string} html
 * @param {string} baseUrl page URL (used to compute slugs)
 * @returns {{heading: object|null, items: Array, pagination: object}}
 */
export function parseListing(html, baseUrl = 'https://moviesmod.fi/') {
  // Scope to the main content column when present so sidebar widgets
  // (which reuse latestPost markup) never leak into results.
  let region = html;
  const boxStart = html.indexOf('id="content_box"');
  if (boxStart !== -1) {
    let boxEnd = html.indexOf('id="site-footer"', boxStart);
    if (boxEnd === -1) boxEnd = html.indexOf('id="sidebar"', boxStart);
    if (boxEnd === -1) boxEnd = html.length;
    region = html.slice(boxStart, boxEnd);
  }

  const items = [];
  ARTICLE_RE.lastIndex = 0;
  let m;
  while ((m = ARTICLE_RE.exec(region)) !== null) {
    const item = parseArticle(m[1], m[2], baseUrl);
    if (item) items.push(item);
  }

  return {
    heading: parseHeading(html),
    items,
    pagination: parsePagination(html),
  };
}

export default parseListing;
