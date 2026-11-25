// The national picture in four or five steps (the trend needs an archive), told on scroll: the section is a tall
// runway with one pinned screen inside it, and how far the reader has scrolled
// through the runway decides which step that screen shows. The step is read
// from the scroll position itself (not from which text box happens to cross
// the middle of the viewport), so it cannot skip, stall or race ahead when the
// visual is taller than the box that triggers it.
//
// Every figure and shape comes from the sourced snapshot and counties.geojson
// and follows the selected month and the reader's reading of "vacant".
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { t, tKind } from '../lib/i18n';
import { formatDuration, formatMonth, formatNumber, formatPercent, monthsBetween } from '../lib/format';
import { longestVacant, primarySite } from '../lib/selectors';
import { useContextStore } from '../lib/context';
import { vacancyOf, vacancyRateOf } from '../lib/vacancy';
import { useAppStore, useHistoryEntries, useSnapshot } from '../store/useAppStore';
import { vacantSeries } from '../lib/statsSelectors';
import { IntroTrend } from './IntroTrend';
import { CountryFill, CountyShape, useCountryShapes } from './CountryShapes';


export function ScrollyIntro() {
  const snapshot = useSnapshot()!;
  const kind = useAppStore((s) => s.kind);
  const shapes = useCountryShapes();
  const runway = useRef<HTMLElement | null>(null);
  const entries = useHistoryEntries();
  // how many steps the runway holds, read by the scroll handler
  const stepCount = useRef(4);
  // which step the runway has scrolled to
  const [active, setActive] = useState(0);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = runway.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pin = el.firstElementChild as HTMLElement | null;
      const travel = rect.height - (pin?.offsetHeight ?? window.innerHeight);
      const p = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      const n = stepCount.current;
      setActive(Math.min(n - 1, Math.floor(p * n)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // what counts as vacant is the reader's choice, site-wide (lib/vacancy)
  const mode = useContextStore((s) => s.dissolved);
  const national = vacancyOf(snapshot.national, mode);
  const popShare = snapshot.national.populationTotal
    ? national.population / snapshot.national.populationTotal : null;
  const worst = useMemo(() => [...snapshot.counties]
    .filter((c) => c.total)
    .sort((a, b) => (vacancyRateOf(b, mode) ?? 0) - (vacancyRateOf(a, mode) ?? 0))[0],
  [snapshot, mode]);
  const worstRate = worst ? vacancyRateOf(worst, mode) : null;
  const withDissolved = mode === 'with' && national.dissolved > 0;
  // and how long a district can wait: the longest-vacant one, on its county
  const longest = useMemo(() => longestVacant(snapshot.praxes), [snapshot]);
  const longestSite = longest ? primarySite(longest) : null;

  // the archived months, first to last (the history counts vacant districts
  // without the dissolved ones)
  const series = useMemo(() => vacantSeries(entries), [entries]);
  const trend = series.length > 1 ? {
    first: series[0], last: series[series.length - 1],
    diff: series[series.length - 1].value - series[0].value,
  } : null;

  const stages = [
    {
      value: formatNumber(national.count),
      label: tKind(withDissolved ? 'intro.step1LabelWith' : 'intro.step1Label', kind),
      tone: 'alert',
      viz: shapes && (
        <CountryFill shapes={shapes} pct={national.rate} color="var(--alert)"
          label={national.rate !== null ? formatPercent(national.rate) : undefined} />
      ),
    },
    ...(trend ? [{
      value: `${trend.diff > 0 ? '+' : trend.diff < 0 ? '−' : ''}${formatNumber(Math.abs(trend.diff))}`,
      label: tKind(trend.diff >= 0 ? 'intro.trendLabelUp' : 'intro.trendLabelDown', kind,
        { year: trend.first.month.slice(0, 4) }),
      tone: 'alert',
      viz: <IntroTrend points={series} color="var(--alert)" />,
      text: tKind('intro.trendText', kind, {
        first: formatMonth(trend.first.month), from: formatNumber(trend.first.value),
        last: formatMonth(trend.last.month), to: formatNumber(trend.last.value),
      }) + (snapshot.national.dissolved > 0 ? ` ${t('intro.trendNoDissolved')}` : ''),
    }] : []),
    {
      value: formatNumber(national.population),
      label: tKind(withDissolved ? 'intro.step2LabelWith' : 'intro.step2Label', kind),
      tone: 'soft',
      viz: shapes && (
        <CountryFill shapes={shapes} pct={popShare} color="var(--alert-soft)"
          label={popShare !== null ? t('intro.popLabel', { pct: formatPercent(popShare) }) : undefined} />
      ),
    },
    {
      value: worstRate !== null ? formatPercent(worstRate) : '–',
      label: worst ? t('intro.step3Label', { county: worst.name }) : '',
      tone: 'alert',
      viz: shapes && worst && <CountyShape shapes={shapes} name={worst.name} />,
    },
    {
      value: longest ? formatDuration(monthsBetween(longest.vacantSince, snapshot.month)) : '–',
      label: longest && longestSite
        ? t('intro.step4Label', { settlement: longestSite.settlement, month: formatMonth(longest.vacantSince) })
        : '',
      tone: 'alert',
      viz: shapes && longest && longestSite
        && longestSite.lat !== undefined && longestSite.lon !== undefined && (
        <CountyShape shapes={shapes} name={longest.county}
          marker={[longestSite.lon, longestSite.lat]} markerLabel={longestSite.settlement} />
      ),
    },
  ];
  // each step's own line under the figure; the trend brings its own
  const fixedTexts = [1, 2, 3, 4].map((n) => tKind(`intro.text${n}`, kind));
  const texts = stages.map((st, i) => ('text' in st && st.text) || fixedTexts[trend && i > 0 ? i - 1 : i]);
  stepCount.current = stages.length;
  const steps = stages.length;
  const stage = stages[Math.min(active, steps - 1)];
  const at = Math.min(active, steps - 1);

  return (
    <section className="intro" ref={runway} aria-label={t('intro.aria')}
      style={{ '--intro-steps': steps } as CSSProperties}>
      <div className="intro__pin">
        <div className="intro__grid">
          <div className={`intro__copy intro__copy--${stage.tone}`} key={`${kind}-${at}`}
            aria-live="polite">
            {/* long figures (1 412 509) shrink to the column instead of
                running into the map */}
            <div className="intro__value"
              style={{ '--intro-len': stage.value.length } as CSSProperties}>{stage.value}</div>
            <p className="intro__label">{stage.label}</p>
            <p className="intro__text">{texts[at]}</p>
          </div>
          <div className="intro__viz" key={`viz-${kind}-${at}`}>{stage.viz}</div>
        </div>

      </div>
    </section>
  );
}
