import { lazy, Suspense, useEffect } from 'react';
import { locale, t } from './lib/i18n';
import { useAppStore, useSnapshot } from './store/useAppStore';
import { Hero } from './components/Hero';
import { PraxisBalance } from './components/PraxisBalance';
import { ScrollyIntro } from './components/ScrollyIntro';
import { ContextBar } from './components/ContextBar';
import { NextSteps } from './components/NextSteps';
import { SITE_NAV, withContext } from './lib/siteNav';
import { contextHref } from './lib/context';
import { useHashScroll } from './lib/useHashScroll';
import { Deferred } from './components/Deferred';
import { WhySection } from './components/WhySection';
import { SearchSection } from './components/SearchSection';
import { Footer } from './components/Footer';
import { LangToggle } from './components/LangToggle';
import { Highlights } from './components/Highlights';
import { NavMenu } from './components/NavMenu';
import { IconStethoscope, IconTooth } from './components/icons';
import { SegmentedControl } from './components/SegmentedControl';
import type { PraxisKind } from './types';

// The map (and MapLibre with it, a megabyte of script, plus the EESZT file
// its popups read) loads once the reader scrolls near it — or at once when the
// address is a shared link to one praxis on it (?p=).
const MapSection = lazy(() =>
  import('./components/MapSection').then((m) => ({ default: m.MapSection })));
const MAP_LINKED = new URLSearchParams(window.location.search).has('p');

/** Where the landing hands the reader on, now that it is only the question. */
const LANDING_NEXT = [
  { href: '/megye.html', titleKey: 'next.county.title', textKey: 'next.county.text' },
  { href: '/jaras.html', titleKey: 'next.myDistrict.title', textKey: 'next.myDistrict.text' },
  { href: '/elemzo.html', titleKey: 'next.analysis.title', textKey: 'next.analysis.text' },
] as const;

export default function App() {
  const snapshot = useSnapshot();
  const kind = useAppStore((s) => s.kind);
  const setKind = useAppStore((s) => s.setKind);
  const loadError = useAppStore((s) => s.loadError);
  const loadData = useAppStore((s) => s.loadData);
  // the sections arrive with the snapshot, so the browser's own jump to
  // #nalam happens before there is anything to jump to
  useHashScroll();

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    // drives the per-kind accent color (see index.css [data-kind='gp'])
    document.documentElement.dataset.kind = kind;
  }, [kind]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, []);

  // sections that have moved to pages of their own: a link someone shared
  // before the split must still arrive where its content lives
  useEffect(() => {
    const moved: Record<string, string> = {
      modszertan: 'modszertan.html',
      adatok: 'modszertan.html#adatok', forrasok: 'modszertan.html',
      rangsor: 'megye.html#rangsor',
      statisztika: 'elemzo.html#statisztika',
      osszevetes: 'elemzo.html#osszevetes',
      tavolsag: 'elemzo.html#tavolsag',
    };
    const target = moved[decodeURIComponent(window.location.hash.slice(1))];
    if (target) window.location.replace(contextHref(target));
  }, []);

  if (loadError) return <div className="error">{loadError}</div>;
  if (!snapshot) return <div className="loading">…</div>;

  return (
    <>
      <nav className="topnav">
        <div className="topnav__inner">
          {/* the landing too: every page's brand leads home, and here it is the
              way back to the top with the reader's place kept */}
          <a className="topnav__brand" href={contextHref(import.meta.env.BASE_URL)}>{t('site.title')}</a>
          <SegmentedControl<PraxisKind> size="xs" className="topnav__kind"
            ariaLabel={t('search.kindLabel')} value={kind} onChange={setKind}
            options={[
              { value: 'gp', label: <IconStethoscope />, ariaLabel: t('kinds.gp.label'), title: t('kinds.gp.label') },
              { value: 'dental', label: <IconTooth />, ariaLabel: t('kinds.dental.label'), title: t('kinds.dental.label') },
            ]} />
          <LangToggle />
          <NavMenu entries={withContext(SITE_NAV)} />
        </div>
      </nav>
      <ContextBar />
      <main className="landing">
        {/* the question and the search that answers it for the reader's own
            town come first; the national picture and the why follow */}
        <Hero><SearchSection /></Hero>
        <ScrollyIntro />
        <WhySection />
        <Deferred ids={['terkep']} minHeight={720} eager={MAP_LINKED}>
          <Suspense fallback={<div style={{ minHeight: 720 }} />}><MapSection /></Suspense>
        </Deferred>
        <PraxisBalance />
        <Highlights />
        <div className="section container"><NextSteps items={LANDING_NEXT} /></div>
      </main>
      <Footer />
    </>
  );
}
