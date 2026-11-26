// Links that carry the reader's place without handing a crawler a new address
// for every place.
//
// The site passes its context (branch, county, settlement, járás) from page
// to page in the query string. Written into every href, that turned the 3177
// settlement pages into ~30 000 addresses for some thirty app pages: Search
// Console (2026-11) counted 12 840 of them as "duplicate without
// user-selected canonical", because the canonical tag is written by a script
// (lib/seo.ts) and Google rarely renders a page it already takes for a
// duplicate.
//
// So an href now holds only what decides which page it is (crawlHref), and
// the context is added at the moment the reader acts on the link — press,
// key, right click for "copy link", or the click itself. A crawler reads
// hrefs and never presses anything, so it only ever meets the canonical
// addresses; the reader lands exactly where the old links took them.
//
// Kept free of imports (and of the zustand store), because the static
// settlement pages load it through their small statictools bundle.

// 'k' and 'm' are what the map has always written, so old links keep working;
// 't' was already taken by the praxis-type filter, hence 'tel'.
export const CONTEXT_KEYS = {
  kind: 'k', county: 'm', settlement: 'tel', dissolved: 'msz', district: 'jar',
} as const;

const KEYS: readonly string[] = Object.values(CONTEXT_KEYS);

/** The context key that names what a page is about — the same ones the
 *  canonical address keeps (lib/seo.ts). */
const PAGE_KEY: Record<string, string> = {
  'megye.html': CONTEXT_KEYS.county,
  'jaras.html': CONTEXT_KEYS.district,
};

/** The data attribute a pre-built link (the static pages) keeps its full
 *  address in. */
export const CTX_ATTR = 'data-ctx';

/**
 * `href` without the context keys that do not decide the page: the county
 * page keeps ?m=, the járás page ?jar=, everything else none of them. Other
 * parameters (lang, resz, orszagok, the map's own) and the anchor stay.
 */
export function crawlHref(href: string): string {
  const i = href.indexOf('#');
  const [full, hash] = i < 0 ? [href, ''] : [href.slice(0, i), href.slice(i)];
  const j = full.indexOf('?');
  if (j < 0) return href;
  const path = full.slice(0, j);
  const q = new URLSearchParams(full.slice(j + 1));
  const page = path.slice(path.lastIndexOf('/') + 1);
  for (const k of KEYS) if (k !== PAGE_KEY[page]) q.delete(k);
  const s = q.toString();
  return `${path}${s ? `?${s}` : ''}${hash}`;
}

/** Whether a link goes to one of this site's pages that read the context. */
export function isContextTarget(href: string, base: string): boolean {
  if (!href || href.startsWith('#')) return false;
  let url: URL;
  try { url = new URL(href, base); } catch { return false; }
  if (url.origin !== new URL(base).origin) return false;
  const p = url.pathname;
  if (p.startsWith('/assets/') || p.startsWith('/data/') || p.endsWith('/embed.html')) return false;
  return p.endsWith('/') || p.endsWith('.html');
}

const EVENTS = ['pointerdown', 'mousedown', 'keydown', 'contextmenu', 'click'] as const;

/**
 * Rewrites a link's href to `target(a)` the moment the reader acts on it.
 * `target` returns null to leave the link alone. Listens in the capture
 * phase, so the address is in place before the browser follows it.
 */
export function installLinkContext(
  target: (a: HTMLAnchorElement) => string | null,
  doc: Document = document,
): () => void {
  const onEvent = (e: Event) => {
    const el = e.target as Element | null;
    const a = el && typeof el.closest === 'function'
      ? el.closest('a[href]') as HTMLAnchorElement | null : null;
    if (!a) return;
    const next = target(a);
    if (next !== null && next !== a.getAttribute('href')) a.setAttribute('href', next);
  };
  for (const ev of EVENTS) doc.addEventListener(ev, onEvent, true);
  return () => { for (const ev of EVENTS) doc.removeEventListener(ev, onEvent, true); };
}

/** The static pages' version: the full address was written at build time. */
export function staticTarget(a: HTMLAnchorElement): string | null {
  return a.getAttribute(CTX_ATTR);
}
