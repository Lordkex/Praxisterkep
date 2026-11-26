// The top bar, grouped. Ten flat links had stopped fitting on a laptop and
// were scrolling sideways; now five entries carry their sections in a
// dropdown. The dropdowns stay short: "Térkép" offers its three zooms (each
// page has its own picker), "Elemző" its six parts with a line on what each
// holds (the sections are on the part itself), "Európa" its sections under
// the same headings as the page's side menu. A group whose label is itself a
// destination stays clickable — "Térkép" goes to the map whether or not you
// open its submenu.
import { Fragment, useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n';
import { INTERNAL_URL } from '../lib/theme';
import { NavTools } from './NavTools';

export interface NavEntry {
  /** href of the group itself: an anchor on this page or another page */
  href: string;
  labelKey: string;
  /** [href, labelKey] links. A third element changes the row: "group" makes
   *  it a heading of the links under it (Európa's five groups), "desc" adds
   *  the line under the label whose key is the fourth element (Elemző's
   *  parts), and "all" is the closing link to the whole page */
  children?: readonly NavChild[];
}

export type NavChild =
  | readonly [string, string]
  | readonly [string, string, 'group' | 'all']
  | readonly [string, string, 'desc', string];

type Child = NavChild;

/** Split a submenu at its group headings; an ungrouped one is one column. */
function columns(children: readonly Child[]): Child[][] {
  const out: Child[][] = [];
  for (const c of children) {
    if (c[2] === 'group' || !out.length) out.push([]);
    out[out.length - 1].push(c);
  }
  return out;
}

const ROW_CLASS: Partial<Record<string, string>> = { group: 'topnav__subhead', all: 'topnav__all' };

export function NavMenu({ entries }: { entries: readonly NavEntry[] }) {
  const [open, setOpen] = useState<string | null>(null);
  // on a phone the whole bar folds behind one button (the CSS shows it there)
  const [folded, setFolded] = useState(true);
  const navRef = useRef<HTMLDivElement>(null);
  // The bar wraps to two rows on a phone and grows further with the folded
  // menu open; whatever sticks below it reads its real height. The measure
  // lives here so every render path — the landing, the standalone pages —
  // gets it. The generated settlement pages run no React; their inline
  // script in web/scripts/settlement-pages.mjs does the same, keep them in
  // step.
  useEffect(() => {
    const el = navRef.current?.closest('nav');
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const set = () => document.documentElement.style.setProperty('--topnav-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // The caret only ever opens. A toggle reads well on paper and fails in the
  // hand: the pointer enters the caret and clicks in one motion, so the hover
  // opens the panel and the click closes it again — the menu looks dead. It
  // closes the three ways a menu should: the pointer leaves, Escape, or a
  // click anywhere outside.
  const show = (href: string) => setOpen(href);

  useEffect(() => {
    if (open === null) return undefined;
    const close = (event: Event) => {
      if (!navRef.current?.contains(event.target as Node)) setOpen(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const done = () => { setOpen(null); setFolded(true); };

  return (
    <>
    <button type="button" className="topnav__menu" aria-expanded={!folded}
      aria-controls="topnav-links" onClick={() => setFolded((f) => !f)}>
      <i aria-hidden="true" /><span className="topnav__menu-label">{t('nav.menu')}</span>
    </button>
    {/* one nav per page: the button's aria-controls and the CSS sibling
        selector both assume this id is unique on the page */}
    <div className={`topnav__links${folded ? '' : ' is-open'}`} id="topnav-links" ref={navRef}>
      {entries.map((entry) => (
        <Fragment key={entry.href}>
        {/* only for a reader who came from the private analysis site
            (?belso=true, see THEME_BOOT in lib/theme.ts): the way back, in
            the place of Módszertan, which moves to the footer */}
        {/modszertan\.html/.test(entry.href) && (
          <div className="topnav__group only-internal">
            <a href={INTERNAL_URL} title={t('nav.internalTitle')}>
              {t('nav.internal')}<span className="topnav__out" aria-hidden="true">{'\u2197'}</span>
            </a>
          </div>
        )}
        <div
          className={`topnav__group${/modszertan\.html/.test(entry.href) ? ' no-internal' : ''}`}
          // hover opens it for a mouse only: on a touch screen the tap would
          // open the panel and the click that follows would close it again
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse' && entry.children) show(entry.href);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') {
              setOpen((cur) => (cur === entry.href ? null : cur));
            }
          }}>
          <a href={entry.href} onClick={done}>
            {t(entry.labelKey)}
            {entry.children && <i className="topnav__caret" aria-hidden="true" />}
          </a>
          {entry.children && (
            <>
              <button className="topnav__toggle" aria-expanded={open === entry.href}
                aria-label={t(entry.labelKey)}
                onClick={(event) => {
                  // a finger has no hover, so nothing opened the panel just
                  // before this tap: here the caret may close it again. On a
                  // phone the open "Térkép" fills the screen, and without
                  // this the only way out was the menu button.
                  const touch = (event.nativeEvent as PointerEvent).pointerType;
                  if (touch && touch !== 'mouse' && open === entry.href) setOpen(null);
                  else show(entry.href);
                }} />
              <div className={`topnav__submenu${entry.children.some((c) => c[2] === 'group')
                ? ' is-grouped' : ''}`} hidden={open !== entry.href}>
                {/* a heading and its links stay together in one column */}
                {columns(entry.children).map((col) => (
                  <div key={col[0][0]} className="topnav__subcol">
                    {col.map((c, j) => (
                      <a key={j} href={c[0]} className={c[2] ? ROW_CLASS[c[2]] : undefined}
                        onClick={done}>
                        {c[3] === undefined ? t(c[1]) : (
                          <>
                            <span className="topnav__label">{t(c[1])}</span>
                            <span className="topnav__desc">{t(c[3])}</span>
                          </>
                        )}
                      </a>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        </Fragment>
      ))}
      <NavTools />
    </div>
    </>
  );
}
