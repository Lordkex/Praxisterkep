// The static pages' half of lib/linkContext.ts: every link a generated page
// writes to an app page keeps only what decides that page in its href, and
// the full address — the reader's settlement and county with it — in
// data-ctx, which the statictools bundle swaps in when the reader acts on
// the link. A crawler follows hrefs, so it meets only canonical addresses.
// Plain JavaScript because the generator runs in Node; linkContext.test.ts
// holds this copy of crawlHref to the app's.

const KEYS = ['k', 'm', 'tel', 'msz', 'jar'];
const PAGE_KEY = { 'megye.html': 'm', 'jaras.html': 'jar' };

/** `href` without the context keys that do not decide the page. */
export function crawlHref(href) {
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

const unesc = (s) => s.replace(/&#38;|&amp;/g, '&').replace(/&#34;|&quot;/g, '"');
const esc = (s) => String(s).replace(/[<>&"]/g, (ch) => `&#${ch.charCodeAt(0)};`);

/**
 * Rewrites every site-relative `<a href>` in `html` whose address carries
 * context the target page does not need: href → crawlHref, the original
 * into data-ctx.
 */
export function splitContextLinks(html) {
  return html.replace(/<a\b([^>]*?)\shref="(\/[^"]*)"/g, (whole, before, raw) => {
    const href = unesc(raw);
    const crawl = crawlHref(href);
    if (crawl === href) return whole;
    return `<a${before} href="${esc(crawl)}" data-ctx="${esc(href)}"`;
  });
}
