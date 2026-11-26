import { describe, expect, it } from 'vitest';
import { crawlHref, installLinkContext, isContextTarget, staticTarget } from './linkContext';
import { crawlHref as crawlHrefStatic, splitContextLinks } from '../../scripts/crawl-links.mjs';

// the addresses a static settlement page used to hand a crawler (2026-11)
const SEEN = [
  '/megye.html?m=Heves&tel=abasar',
  '/jaras.html?jar=Gy%C3%B6ngy%C3%B6si&m=Heves&tel=abasar',
  '/jaras.html?m=Heves&tel=abasar',
  '/?m=Heves&tel=abasar',
  '/elemzo.html?m=Heves&tel=abasar#index',
  '/elemzo.html?resz=telepulesek&k=dental&msz=1&lang=en',
  'megye.html?k=dental&m=Zala&tel=zalaegerszeg&jar=Zalaegerszegi',
  '/telepules/abasar/?k=dental&m=Heves',
  '/europa.html?orszagok=cee&m=Vas#munkaero',
];

describe('crawl-safe links', () => {
  it('keeps only what decides the page', () => {
    expect(SEEN.map(crawlHref)).toEqual([
      '/megye.html?m=Heves',
      '/jaras.html?jar=Gy%C3%B6ngy%C3%B6si',
      '/jaras.html',
      '/',
      '/elemzo.html#index',
      '/elemzo.html?resz=telepulesek&lang=en',
      'megye.html?m=Zala',
      '/telepules/abasar/',
      '/europa.html?orszagok=cee#munkaero',
    ]);
  });

  it('leaves a link without a query alone', () => {
    expect(crawlHref('/modszertan.html#kimenetek')).toBe('/modszertan.html#kimenetek');
    expect(crawlHref('#nalam')).toBe('#nalam');
  });

  it('is the same rule in the static generator', () => {
    for (const h of SEEN) expect(crawlHrefStatic(h)).toBe(crawlHref(h));
  });

  it('moves the context of a static link into data-ctx', () => {
    const html = '<a class="x" href="/jaras.html?jar=Gy%C3%B6ngy%C3%B6si&#38;m=Heves&#38;tel=abasar">J</a>'
      + '<a href="/telepules/gyongyos/">G</a><a href="https://neak.gov.hu/?m=1&#38;tel=2">N</a>';
    expect(splitContextLinks(html)).toBe(
      '<a class="x" href="/jaras.html?jar=Gy%C3%B6ngy%C3%B6si" '
      + 'data-ctx="/jaras.html?jar=Gy%C3%B6ngy%C3%B6si&#38;m=Heves&#38;tel=abasar">J</a>'
      + '<a href="/telepules/gyongyos/">G</a><a href="https://neak.gov.hu/?m=1&#38;tel=2">N</a>');
  });

  it('knows which links go to this site\'s pages', () => {
    const base = 'https://praxisterkep.hu/megye.html?m=Vas';
    expect(isContextTarget('/elemzo.html', base)).toBe(true);
    expect(isContextTarget('jaras.html?jar=Pápai', base)).toBe(true);
    expect(isContextTarget('/telepules/sarvar/', base)).toBe(true);
    expect(isContextTarget('/', base)).toBe(true);
    expect(isContextTarget('#nalam', base)).toBe(false);
    expect(isContextTarget('/embed.html?k=gp', base)).toBe(false);
    expect(isContextTarget('/data/latest.json', base)).toBe(false);
    expect(isContextTarget('https://neak.gov.hu/', base)).toBe(false);
  });

  // no DOM in the test runner: a document that only dispatches, and a link
  // that only keeps attributes, are all the listener touches
  function fakePage(attrs: Record<string, string>) {
    const listeners: Record<string, ((e: Event) => void)[]> = {};
    const doc = {
      addEventListener: (t: string, f: (e: Event) => void) => { (listeners[t] ??= []).push(f); },
      removeEventListener: (t: string, f: (e: Event) => void) => {
        listeners[t] = (listeners[t] ?? []).filter((g) => g !== f);
      },
    } as unknown as Document;
    const a = {
      getAttribute: (k: string) => attrs[k] ?? null,
      setAttribute: (k: string, v: string) => { attrs[k] = v; },
      hasAttribute: (k: string) => k in attrs,
    } as unknown as HTMLAnchorElement;
    // the text inside the link is what the reader presses
    const inner = { closest: () => a };
    const fire = (type: string) => (listeners[type] ?? []).forEach((f) => f({ target: inner } as unknown as Event));
    return { doc, attrs, fire };
  }

  it('swaps the full address in when the reader acts on the link', () => {
    for (const type of ['pointerdown', 'mousedown', 'keydown', 'contextmenu', 'click']) {
      const { doc, attrs, fire } = fakePage({ href: '/megye.html?m=Heves', 'data-ctx': '/megye.html?m=Heves&tel=abasar' });
      const off = installLinkContext(staticTarget, doc);
      fire(type);
      expect(attrs.href).toBe('/megye.html?m=Heves&tel=abasar');
      off();
    }
  });

  it('leaves the href alone until then, and after it stops listening', () => {
    const { doc, attrs, fire } = fakePage({ href: '/megye.html?m=Heves', 'data-ctx': '/megye.html?m=Heves&tel=abasar' });
    const off = installLinkContext(staticTarget, doc);
    expect(attrs.href).toBe('/megye.html?m=Heves');
    off();
    fire('click');
    expect(attrs.href).toBe('/megye.html?m=Heves');
  });
});
