// "Négy keresztmetszet" — what the existing data says when it is read
// against itself: how long a vacancy lasts against how far the next doctor
// is, against how old the village is, against whether a bus goes there, and
// the contiguous care deserts. No new source is behind any of it.
import { useMemo } from 'react';
import { t } from '../lib/i18n';
import { formatDecimal, formatDuration, formatNumber } from '../lib/format';
import { contextHref, currentContext } from '../lib/context';
import { useOutcomes } from '../lib/outcomes';
import { OutcomeScatter, type ScatterPoint } from './charts/OutcomeScatter';
import { PageLink } from './PageLink';

const BANDS = [[0, 24], [24, 60], [60, 120], [120, 10000]] as const;

function median(v: number[]): number | null {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b); const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function settlementHref(slug: string): string {
  return contextHref(`/telepules/${slug}/`, currentContext());
}

/** The four readings for the whole country, or — on a county or a járás
 *  page — for that area's own settlements. */
export function CrossSection({ area, sub }: {
  area?: { level: 'county' | 'district'; name: string };
  /** a part of a bigger section (the járás page's "Elérhetőség"): an h3 */
  sub?: boolean;
}) {
  const o = useOutcomes();
  const pts = useMemo(() => (o?.cross.durationTravel ?? [])
    .filter((p) => !area || p[area.level] === area.name), [o, area]);
  const bands = useMemo(() => BANDS.map(([lo, hi]) => {
    const b = pts.filter((p) => p.months >= lo && p.months < hi && p.minutes !== null);
    return { lo, hi, n: b.length, minutes: median(b.map((p) => p.minutes as number)),
      noBus: b.filter((p) => p.bus === false).length };
  }), [pts]);
  if (!o) return null;
  const local = area ? o.cross.areas[`${area.level}:${area.name}`] : null;
  if (area && !local) return null;
  // all four readings count settlements served by vacant districts only;
  // where an area has none (a kerület, a well-served járás) every card would
  // read zero, which says nothing — the section is left out
  if (local && !pts.length && !local.bus.vacantOnly && !local.deserts.settlements
    && local.ageBands.every((b) => !b.vacantOnly)) return null;
  const c = { ...o.cross, ...(local ? { ageBands: local.ageBands, bus: local.bus } : {}) };
  const scatter: ScatterPoint[] = pts.filter((p) => p.minutes !== null).map((p) => ({
    id: p.slug, label: p.name, sub: `${p.county} · ${formatDuration(p.months)}`,
    x: p.months / 12, y: p.minutes as number, size: p.population,
    group: p.bus === false ? 0 : p.state === 'vacantOnly' ? 1 : 2,
  }));
  const maxBand = Math.max(...bands.map((b) => b.minutes ?? 0), 1);
  const ageMax = Math.max(0.01, ...c.ageBands.map((b) => b.vacantOnly / b.settlements));
  const d = c.deserts.stats ?? {};
  // on an area page a card with nothing in it is left out: a small járás drew
  // three 0% columns and "0 settlements (0 people) of 0". The country view
  // always has something to say, and the deserts card says "none" in words.
  const showDuration = !local || pts.length > 0;
  const showAge = !local || c.ageBands.some((b) => b.vacantOnly > 0);
  const showBus = !local || c.bus.vacantOnly > 0;
  const Heading = sub ? 'h3' : 'h2';
  // the scatter draws from three settlements up; below that the bands stand alone
  const split = !!area && scatter.length >= 3;

  return (
    <section className={area ? 'outcome cross-local' : 'section container outcome'} id="keresztmetszet">
      {area ? (
        <>
          <Heading className={sub ? 'why__chain-title' : 'section__subheading'}>
            {t('outcomes.cross.localHeading', { name: area.name })}</Heading>
          <p className="section__explain">{t('outcomes.cross.localLead')}</p>
        </>
      ) : (
        <>
          <h2 className="section__heading">{t('outcomes.cross.heading')}</h2>
          <p className="section__lead">{t('outcomes.cross.lead')}</p>
        </>
      )}

      <div className="cross-grid">
        {showDuration && <article className="cross-card cross-card--wide">
          <h3>{t('outcomes.cross.durationHeading')}</h3>
          <p>{t('outcomes.cross.durationText', { n: formatNumber(pts.length) })}</p>
          {/* on an area page the bands and the scatter stand side by side */}
          <div className={split ? 'cross-split' : undefined}>
            <div className="bandbars">
              {bands.map((b, i) => (
                <div key={i} className="bandbars__row">
                  <span className="bandbars__label">{t(`outcomes.cross.band${i}`)}</span>
                  <span className="bandbars__bar">
                    <i style={{ width: `${(100 * (b.minutes ?? 0)) / maxBand}%` }} />
                  </span>
                  <b>{b.minutes === null ? '–' : `${formatDecimal(b.minutes.toFixed(1))} ${t('outcomes.min')}`}</b>
                  <small>{t('outcomes.cross.bandN', { n: b.n })}</small>
                </div>
              ))}
            </div>
            <OutcomeScatter points={scatter}
              xLabel={t('outcomes.cross.xYears')} yLabel={t('outcomes.cross.yMinutes')}
              xFormat={(v) => `${Math.round(v)} ${t('outcomes.yr')}`}
              yFormat={(v) => `${Math.round(v)} ${t('outcomes.min')}`}
              groupLabels={[t('outcomes.cross.gNoBus'), t('outcomes.cross.gOnly'), t('outcomes.cross.gPartial')]}
              compact={split}
              onPick={(slug) => { window.location.href = settlementHref(slug); }} />
          </div>
        </article>}

        {showAge && <article className="cross-card">
          <h3>{t('outcomes.cross.ageHeading')}</h3>
          <p>{t('outcomes.cross.ageText')}</p>
          <div className="agebars">
            {c.ageBands.map((b) => {
              const share = b.vacantOnly / b.settlements;
              return (
                <div key={b.from} className="agebars__col" title={t('outcomes.cross.ageTitle', {
                  from: b.from, to: b.to, n: b.settlements, share: Math.round(100 * share) })}>
                  <span className="agebars__val">{Math.round(100 * share)}%</span>
                  <span className="agebars__bar" style={{ height: `${(100 * share) / ageMax}%` }}
                    data-small={b.settlements < 30 ? 'true' : undefined} />
                  <span className="agebars__lab">{b.from}–{b.to}%</span>
                  <small>n={b.settlements}</small>
                </div>
              );
            })}
          </div>
          <p className="outcome__hint">{t('outcomes.cross.ageNote')}</p>
        </article>}

        {showBus && <article className="cross-card">
          <h3>{t('outcomes.cross.busHeading')}</h3>
          <p className="cross-card__big">
            <b>{formatNumber(c.bus.noDirectBus)}</b>
            <span>{t('outcomes.cross.busBig', {
              people: formatNumber(c.bus.noDirectBusPopulation),
              of: formatNumber(c.bus.vacantOnly),
            })}</span>
          </p>
          {/* the settlements as a small table: who lives there, and a bar for
              how long the district has been empty (the longest = full width) */}
          <div className="bus-list">
            <div className="bus-list__head">
              <span>{t('outcomes.cross.busCols.name')}</span>
              <span>{t('outcomes.cross.busCols.people')}</span>
              <span>{t('outcomes.cross.busCols.since')}</span>
            </div>
            {(() => {
              // longest empty first (then the larger place), so the bars fall
              const shown = [...c.bus.stranded]
                .sort((a, b) => b.months - a.months || b.population - a.population).slice(0, 10);
              const longest = Math.max(1, ...shown.map((s) => s.months));
              return shown.map((s) => (
                <div key={s.slug} className="bus-list__row">
                  <a href={settlementHref(s.slug)}>{s.name}</a>
                  <span className="bus-list__people">{formatNumber(s.population)} {t('outcomes.people')}</span>
                  <span className="bus-list__since">
                    <i style={{ width: `${(s.months / longest) * 100}%` }} />
                    <small>{formatDuration(s.months)}</small>
                  </span>
                </div>
              ));
            })()}
          </div>
        </article>}

        <article className="cross-card cross-card--wide cross-card--row">
          <h3>{t('outcomes.cross.desertHeading')}</h3>
          {local ? (
            <p className="cross-card__big">
              <b>{formatNumber(local.deserts.settlements)}</b>
              <span>{local.deserts.settlements
                ? t('outcomes.cross.desertLocal', {
                  people: formatNumber(local.deserts.population),
                  clusters: formatNumber(local.deserts.clusters), of: formatNumber(local.settlements) })
                : t('outcomes.cross.desertNone')}</span>
            </p>
          ) : (
            <>
              <p className="cross-card__big">
                <b>{formatNumber(d.clusters ?? 0)}</b>
                <span>{t('outcomes.cross.desertBig', {
                  settlements: formatNumber(d.settlementsInClusters ?? 0),
                  people: formatNumber(d.populationInClusters ?? 0),
                })}</span>
              </p>
              <p>{t('outcomes.cross.desertText', {
                isolated: formatNumber(d.isolated ?? 0),
                isolatedPeople: formatNumber(d.isolatedPopulation ?? 0),
              })}</p>
            </>
          )}
          <PageLink className="cross-card__more" href={area ? '/elemzo.html#hianyteruletek' : '#hianyteruletek'}>
            {t('outcomes.cross.desertMore')}</PageLink>
        </article>
      </div>
    </section>
  );
}
