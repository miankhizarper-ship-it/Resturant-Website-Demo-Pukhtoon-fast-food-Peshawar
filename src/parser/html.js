// Tiny dependency-free HTML helpers that work in Node and Cloudflare Workers.

const NAMED = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  copy: '©',
  reg: '®',
  trade: '™',
  middot: '·',
  bull: '•',
  raquo: '»',
  laquo: '«',
  times: '×',
  divide: '÷',
  euro: '€',
  pound: '£',
  yen: '¥',
  cent: '¢',
  deg: '°',
  plusmn: '±',
  frac12: '½',
  frac14: '¼',
  sup2: '²',
  sup3: '³',
  micro: 'µ',
  para: '¶',
  sect: '§',
  dagger: '†',
  permil: '‰',
  prime: '′',
  Prime: '″',
  lsaquo: '‹',
  rsaquo: '›',
  oline: '‾',
  frasl: '⁄',
  weierp: '℘',
  image: 'ℑ',
  alefsym: 'ℵ',
  larr: '←',
  uarr: '↑',
  rarr: '→',
  darr: '↓',
  harr: '↔',
  crarr: '↵',
  lArr: '⇐',
  rArr: '⇒',
  hArr: '⇔',
  forall: '∀',
  part: '∂',
  exist: '∃',
  empty: '∅',
  nabla: '∇',
  isin: '∈',
  notin: '∉',
  ni: '∋',
  prod: '∏',
  sum: '∑',
  minus: '−',
  lowast: '∗',
  radic: '√',
  prop: '∝',
  infin: '∞',
  ang: '∠',
  and: '∧',
  or: '∨',
  cap: '∩',
  cup: '∪',
  int: '∫',
  there4: '∴',
  sim: '∼',
  cong: '≅',
  asymp: '≈',
  ne: '≠',
  equiv: '≡',
  le: '≤',
  ge: '≥',
  sub: '⊂',
  sup: '⊃',
  sube: '⊆',
  supe: '⊇',
  oplus: '⊕',
  otimes: '⊗',
  perp: '⊥',
  sdot: '⋅',
  lceil: '⌈',
  rceil: '⌉',
  lfloor: '⌊',
  rfloor: '⌋',
  loz: '◊',
  spades: '♠',
  clubs: '♣',
  hearts: '♥',
  diams: '♦',
  check: '✓',
  cross: '✗',
  star: '☆',
  starf: '★',
};

/** Decode HTML entities (named + numeric) in a text fragment. */
export function decodeEntities(input) {
  if (!input) return '';
  return String(input).replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (whole, body) => {
      try {
        if (body[0] === '#') {
          const code =
            body[1] === 'x' || body[1] === 'X'
              ? parseInt(body.slice(2), 16)
              : parseInt(body.slice(1), 10);
          if (Number.isFinite(code) && code > 0 && code <= 0x10ffff) {
            return String.fromCodePoint(code);
          }
          return whole;
        }
        if (Object.prototype.hasOwnProperty.call(NAMED, body)) return NAMED[body];
        // Unknown named entity - leave as-is (WordPress uses a few rare ones).
        return whole;
      } catch {
        return whole;
      }
    }
  );
}

/** Strip tags and collapse whitespace -> plain text. */
export function stripTags(html) {
  if (!html) return '';
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract an attribute value from a single tag string.
 * Handles quoted, single-quoted and unquoted values.
 */
export function getAttr(tag, name) {
  if (!tag) return null;
  const re = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+))`,
    'i'
  );
  const m = tag.match(re);
  if (!m) return null;
  return decodeEntities(m[1] ?? m[2] ?? m[3] ?? '');
}

/** Return the full opening tag string for the nth match of a pattern. */
export function nthTag(html, re, n = 0) {
  let i = 0;
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (i === n) return m;
    i += 1;
    if (m.index === re.lastIndex) re.lastIndex += 1;
  }
  return null;
}

/** Slice html between a start marker and an end marker (both optional). */
export function sliceBetween(html, start, end) {
  let from = 0;
  if (start) {
    const i = html.indexOf(start);
    if (i === -1) return '';
    from = i;
  }
  let to = html.length;
  if (end) {
    const j = html.indexOf(end, from);
    if (j !== -1) to = j;
  }
  return html.slice(from, to);
}

/** Make a possibly-relative URL absolute against a base. */
export function absUrl(href, base) {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}
