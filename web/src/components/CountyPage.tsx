// "Megye" (megye.html) — the level between the country and a town.
//
// Everything on this site was either national or about one of 3177
// settlements; a county was only ever a filter on the map. This page answers
// the same questions one zoom level up, and hands the reader on to the
// settlements it is made of.
//
// It follows the járás page: the pick and a guess first (before any number
// shows), a summary of three rings, then theme by theme — care, access,
// people, economy, health — each with the same cards (value, a strip of the
// twenty counties, the median, the place from the worst end), the county's
// járás and settlements, and last the national blocks.
import { useMemo, useState } from 'react';
import { t } from '../lib/i18n';
import {
  CountyCards, CountyDistricts, CountyForecastGrants, CountyMeasureRanking, CountyTrends,
} from './CountyOutcomes';
import { formatDecimal, formatNumber, formatPercent } from '../lib/format';
import { useContextStore } from '../lib/context';
import { useHashScroll } from '../lib/useHashScroll';
import {
  countyOf, rankOf, settlementRows, useCounties, vacantShare,
  type Band, type CountyAggregateRow, type SettlementRow, type State,
} from '../lib/counties';
import { settlementHref } from '../lib/settlementLink';
import { CountyRanking } from './CountyRanking';
import { CountyPicker } from './CountyPicker';
import { CountyChurn } from './CountyChurn';
import { GuessGame } from './GuessGame';
import { AGE_COLORS, type AgeKey } from './charts/AgePie';
import { Donut, DonutLegend } from './charts/Donut';
import { CompareBars, ShareDots } from './charts/DistrictFigures';
import { IconBusOff } from './icons';
import { PointGrid } from './charts/PointGrid';
import { CrossSection } from './CrossSection';
import { Headline } from './Headline';
import { SegmentedControl } from './SegmentedControl';
import { vacancyOf } from '../lib/vacancy';
import { PageNav } from './PageNav';
import { SideNav } from './SideNav';
import { sideGroups } from '../lib/sideGroups';
import { NextSteps } from './NextSteps';
import { Footer } from './Footer';
import { PdfButton } from './PdfButton';
import { CountyStory } from './story/PageStories';

const COUNTY_GROUPS = sideGroups('county');

const NEXT = [
  { href: 'elemzo.html', titleKey: 'next.analysis.title', textKey: 'next.analysis.text' },
  { href: '/', titleKey: 'next.map.title', textKey: 'next.map.text' },
  { href: 'szakellato.html', titleKey: 'next.specialist.title',
    textKey: 'next.specialist.text' },
] as const;

type SortKey = 'name' | 'population' | 'band' | 'gpMin' | 'oncallMin';
const BAND_ORDER: Record<Band, number> = {
  kiemelt: 0, magas: 1, kozepes: 2, alacsony: 3, '': 4,
};
const AGE_KEYS: readonly AgeKey[] = ['young', 'working', 'old'];
// the three rings of the summary: one size, one ring width (as on the járás page)
const RING = 130;
const RING_W = 20;
// a county has up to 400 settlements; the first ones in the chosen order
// show, the rest on request
const FIRST_ROWS = 30;

function minutes(value: number | null): string {
  // Hungarian decimals take a comma; formatDecimal is where that lives
  return value === null ? '–' : t('county.minutes', { n: formatDecimal(value.toFixed(1)) });
}

function StateDot({ state }: { state: State }) {
  return (
    <span className={`county-dot county-dot--${state || 'absent'}`}
      title={t(`county.state.${state || 'absent'}`)} />
  );
}

/**
 * The drive times, the bus and the emergency points, as cards beside the
 * outcome ones. They come from the counties file, which carries no strip for
 * them; the emergency card is wide, with the points themselves.
 */
function AccessCards({ c, which, rank }: {
  c: CountyAggregateRow; which: 'drive' | 'places'; rank: { rank: number; of: number } | null;
}) {
  if (which === 'drive') {
    const drive = [['gp', c.medianGpMinutes], ['dental', c.medianDentalMinutes],
      ['inpatient', c.medianInpatientMinutes]] as const;
    return drive.map(([k, v]) => (
      <article key={k} className="yard-card">
        <h3>{t(`county.access.${k}`)}</h3>
        <div className="yard-card__value">{minutes(v)}</div>
        <p className="yard-card__rank">{t('county.access.driveNote')}</p>
      </article>
    ));
  }
  return (
    <>
      <article className="yard-card">
        <h3>{t('county.access.bus')}</h3>
        {/* the struck-through bus beside the count, and every settlement as a
            dot under it, the ones without a direct bus lit */}
        <div className="yard-card__iconvalue">
          <span className="yard-card__icon" aria-hidden="true"><IconBusOff /></span>
          <div className="yard-card__value">{formatNumber(c.withoutDirectBus)}</div>
        </div>
        <p className="yard-card__rank">{t('county.access.busNote', {
          n: formatNumber(c.settlements), share: formatPercent(c.withoutDirectBus / c.settlements) })}</p>
        <ShareDots total={c.settlements} marked={c.withoutDirectBus} max={500} dense={c.settlements > 300}
          title={t('county.access.busDots', { n: formatNumber(c.withoutDirectBus), of: formatNumber(c.settlements) })} />
      </article>
      <article className="yard-card yard-card--wide yard-card--points">
        <h3>{t('county.pointsTitle')}</h3>
        <PointGrid points={c.emergency ?? []} base={import.meta.env.BASE_URL} />
        <p className="yard-card__rank">
          {c.medianOncallMinutes !== null && t('county.oncallMedian', { m: minutes(c.medianOncallMinutes) })}
          {rank && ` · ${t('county.rank', { rank: rank.rank, of: rank.of })}`}
        </p>
      </article>
    </>
  );
}

export function CountyPage() {
  useHashScroll();
  const data = useCounties();
  const county = useContextStore((s) => s.county);
  const setCounty = useContextStore((s) => s.setCounty);
  const kind = useContextStore((s) => s.kind);
  const setKind = useContextStore((s) => s.setKind);
  const [sort, setSort] = useState<SortKey>('band');
  const [showAll, setShowAll] = useState(false);
  // what the pointer is on, in each of the three rings: the card says what it
  // is rather than leaving the colour to be decoded against a legend
  const [ageOn, setAgeOn] = useState<string | null>(null);
  const [stateOn, setStateOn] = useState<string | null>(null);
  const [dentalOn, setDentalOn] = useState<string | null>(null);
  /** the settlement table below follows whichever slice was clicked */
  const [filter, setFilter] = useState<{ branch: 'gp' | 'dental'; state: State } | null>(null);

  const agg = countyOf(data, county);
  const rows = useMemo(() => {
    const list = settlementRows(data, county)
      .filter((r) => !filter || r[filter.branch] === filter.state);
    const by: Record<SortKey, (a: SettlementRow, b: SettlementRow) => number> = {
      name: (a, b) => a.name.localeCompare(b.name, 'hu'),
      population: (a, b) => b.population - a.population,
      band: (a, b) => BAND_ORDER[a.band] - BAND_ORDER[b.band]
        || b.population - a.population,
      gpMin: (a, b) => (b.gpMin ?? -1) - (a.gpMin ?? -1),
      oncallMin: (a, b) => (b.oncallMin ?? -1) - (a.oncallMin ?? -1),
    };
    return [...list].sort(by[sort]);
  }, [data, county, sort, filter]);
  const shownRows = showAll ? rows : rows.slice(0, FIRST_ROWS);

  // the settlements of the county by what their GP care looks like
  const stateSlices = agg ? [
    { value: agg.gpVacantOnly, color: 'var(--bad)',
      label: t('county.state.vacantOnly'), state: 'vacantOnly' as State },
    { value: agg.gpPartial, color: 'var(--warn)',
      label: t('county.state.partial'), state: 'partial' as State },
    { value: agg.settlements - agg.gpVacantOnly - agg.gpPartial,
      color: 'var(--good)', label: t('county.state.filled'), state: 'filled' as State },
  ] : [];

  // the county's dental districts, as NEAK counts them. The ring always
  // counts the dissolved districts: it is the county's own stock, and a
  // contract that ended is part of what became of it.
  const dentalParts = vacancyOf(agg?.dentalDistricts, 'with');
  const dentalTotal = agg?.dentalDistricts?.total ?? 0;
  const dentalSlices = agg?.dentalDistricts ? [
    { value: agg.dentalDistricts.vacant, color: 'var(--bad)',
      label: t('stats.statusVacant'), state: 'vacantOnly' as State },
    { value: agg.dentalDistricts.dissolved, color: 'var(--line-strong)',
      label: t('stats.statusDissolved'), state: '' as State },
    { value: Math.max(agg.dentalDistricts.total - agg.dentalDistricts.vacant
      - agg.dentalDistricts.dissolved, 0), color: 'var(--good)',
      label: t('stats.statusFilled'), state: 'filled' as State },
  ].filter((s) => s.value > 0) : [];
  const ageSlices = agg?.age ? AGE_KEYS.map((key) => ({
    key, value: agg.age![key], color: AGE_COLORS[key], label: t(`age.part.${key}`),
  })) : [];

  /** A slice names a class of settlement; clicking one shows just those. */
  const pickState = (branch: 'gp' | 'dental', label: string,
    slices: { label: string; state?: State }[]) => {
    const state = slices.find((s2) => s2.label === label)?.state;
    if (!state) return;
    setFilter((cur) => (cur && cur.branch === branch && cur.state === state
      ? null : { branch, state }));
    setShowAll(false);
  };

  // what an average county looks like, so the summary can say how this one
  // compares — twenty rows, cheap enough to sum in the browser
  const average = useMemo(() => {
    const list = data?.counties ?? [];
    if (!list.length) return null;
    const mean = (f: (c: typeof list[number]) => number) =>
      list.reduce((a, c) => a + f(c), 0) / list.length;
    return {
      population: mean((c) => c.population),
      settlements: mean((c) => c.settlements),
    };
  }, [data]);

  const gpRank = rankOf(data, county, (c) => vacantShare(c, 'gp'));
  const oncallRank = rankOf(data, county, (c) => c.medianOncallMinutes);
  const of = (n: number, total: number) => (
    <>{formatNumber(n)}<span className="stat__of"> / {formatNumber(total)}</span></>
  );

  return (
    <>
      <PageNav kind={kind} onKind={setKind} />
      <SideNav groups={COUNTY_GROUPS} labelKey="sideNav.county.label" />
      <section className="section container" id="varmegye">
        <div className="heading-row">
          <h1 className="section__heading">{t('county.heading')}</h1>
          {agg && <PdfButton level="county" name={agg.name} />}
        </div>
        <p className="section__lead">{t('county.lead')}</p>

        {/* the map is the picker; the list is for the keyboard, in its corner */}
        <CountyPicker side={(
          <label className="county-picker">
            <span>{t('county.pick')}</span>
            <select value={county ?? ''} onChange={(e) => setCounty(e.target.value || null)}>
              <option value="">{t('county.pickNone')}</option>
              {(data?.counties ?? []).map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </label>
        )} />

        {/* a guess before any number of the county shows */}
        <GuessGame key={county ?? ''} initial={county} lead />

        <CountyStory />

        {!data && <p className="loading">…</p>}
        {data && !agg && <p className="section__explain">{t('county.nothingPicked')}</p>}

        {agg && (
          <>
            {/* the heading and its sentence on the left, how big this county
                is against an average one beside them */}
            <div className="district-intro">
              <div className="district-intro__text">
                <h2 className="section__subheading" id="attekintes">
                  {t('county.stateHeading', { name: agg.name })}
                </h2>
                <p className="section__explain">{t('county.introText')}</p>
              </div>
              {average && (
                <div className="district-intro__bench">
                  <CompareBars rows={[
                    {
                      key: 'settlements',
                      label: t('county.benchSettlements'),
                      value: agg.settlements,
                      reference: average.settlements,
                      referenceLabel: t('county.benchAverage'),
                      format: (v) => formatDecimal(v.toFixed(v < 10 ? 1 : 0)),
                    },
                    {
                      key: 'population',
                      label: t('county.benchPopulation'),
                      value: agg.population,
                      reference: average.population,
                      referenceLabel: t('county.benchAverage'),
                      format: (v) => formatNumber(Math.round(v)),
                    },
                  ]} />
                </div>
              )}
            </div>

            <div className="county-cards county-cards--fill">
              {/* three rings alike: the figure and its words beside the ring,
                  the legend and the context under both */}
              <article className="county-card county-card--stacked">
                <div className="county-card__head">
                  {agg.age && (
                    <div className="county-card__figure">
                      <Donut size={RING} thickness={RING_W} slices={ageSlices}
                        active={ageOn} onActive={setAgeOn}>
                        <span className="donut__stack">
                          <strong>{formatPercent(agg.age.old / agg.age.total)}</strong>
                          <small>{t('age.part.old')}</small>
                        </span>
                      </Donut>
                    </div>
                  )}
                  <Headline on={ageOn ?? ''} variants={[
                    { key: '', value: formatNumber(agg.population),
                      label: t('county.populationIn', { n: formatNumber(agg.settlements) }) },
                    ...ageSlices.map((s) => ({
                      key: s.label, value: formatNumber(s.value),
                      label: t('county.ageOf', {
                        group: s.label, share: formatPercent(s.value / agg.age!.total),
                      }),
                    })),
                  ]} />
                </div>
                <div className="county-card__body">
                  {agg.age && <DonutLegend slices={ageSlices} active={ageOn} onActive={setAgeOn} />}
                </div>
              </article>

              {/* how many of its settlements have nobody under contract */}
              <article className="county-card county-card--stacked">
                <div className="county-card__head">
                  <div className="county-card__figure">
                    <Donut size={RING} thickness={RING_W} slices={stateSlices}
                      active={stateOn} onActive={setStateOn}
                      onPick={(label: string) => pickState('gp', label, stateSlices)}>
                      <strong>{formatPercent(agg.gpVacantOnly / agg.settlements)}</strong>
                    </Donut>
                  </div>
                  <Headline on={stateOn ?? ''} variants={[
                    { key: '', value: of(agg.gpVacantOnly, agg.settlements),
                      label: t('county.gpVacantOnlyOf') },
                    ...stateSlices.map((s) => ({
                      key: s.label, value: of(s.value, agg.settlements),
                      label: t('county.stateOf', {
                        state: s.label.toLowerCase(), share: formatPercent(s.value / agg.settlements),
                      }),
                    })),
                  ]} />
                </div>
                <div className="county-card__body">
                  <DonutLegend slices={stateSlices} active={stateOn} onActive={setStateOn}
                    onPick={(label: string) => pickState('gp', label, stateSlices)} />
                  {gpRank && <div className="stat__context">
                    {t('county.rank', { rank: gpRank.rank, of: gpRank.of })}</div>}
                </div>
              </article>

              {/* the dental districts themselves, not the settlements */}
              <article className="county-card county-card--stacked">
                <div className="county-card__head">
                  <div className="county-card__figure">
                    <Donut size={RING} thickness={RING_W} slices={dentalSlices}
                      active={dentalOn} onActive={setDentalOn}
                      onPick={(label: string) => pickState('dental', label, dentalSlices)}>
                      <strong>{formatPercent(dentalParts.count / (dentalTotal || 1))}</strong>
                    </Donut>
                  </div>
                  <Headline on={dentalOn ?? ''} variants={[
                    { key: '', value: of(dentalParts.count, dentalTotal),
                      label: t('county.dentalDistricts') },
                    ...dentalSlices.map((s) => ({
                      key: s.label, value: of(s.value, dentalTotal),
                      label: t('county.dentalOf', { state: s.label.toLowerCase() }),
                    })),
                  ]} />
                </div>
                <div className="county-card__body">
                  <DonutLegend slices={dentalSlices} active={dentalOn} onActive={setDentalOn}
                    onPick={(label: string) => pickState('dental', label, dentalSlices)} />
                  <div className="stat__context">{t('county.dentalLongTerm', {
                    n: formatNumber(agg.dentalDistricts?.longTerm ?? 0),
                    dissolved: formatNumber(agg.dentalDistricts?.dissolved ?? 0),
                  })}</div>
                </div>
              </article>
            </div>
            {agg.dentalAbsent > 0 && (
              <p className="outcome__hint">{t('county.dentalSeats', { n: formatNumber(agg.dentalAbsent) })}</p>
            )}

            <h2 className="section__subheading" id="ellatas">{t('county.part.care')}</h2>
            <p className="section__explain">{t('county.partLead.care')}</p>
            <CountyCards county={agg.name} keys={['gpRateIn12']} trail={(
              <article className="yard-card">
                <h3>{t('county.bandCard')}</h3>
                <div className="yard-card__value">{formatNumber(agg.bands.kiemelt ?? 0)}</div>
                <p className="yard-card__rank">{t('county.bandCardNote', {
                  magas: formatNumber(agg.bands.magas ?? 0), n: formatNumber(agg.settlements) })}</p>
              </article>
            )} />
            <p className="outcome__hint">{t('county.stripNote')}</p>
            <CountyForecastGrants county={agg.name} />

            <h2 className="section__subheading" id="elerhetoseg">{t('county.part.access')}</h2>
            <p className="section__explain">{t('county.partLead.access')}</p>
            <CountyCards county={agg.name} keys={['sboMinutes']}
              lead={<AccessCards c={agg} which="drive" rank={null} />}
              trail={<AccessCards c={agg} which="places" rank={oncallRank} />} />
            <CrossSection area={{ level: 'county', name: agg.name }} sub />

            <h2 className="section__subheading" id="nepesseg">{t('county.part.people')}</h2>
            <p className="section__explain">{t('county.partLead.people')}</p>
            <CountyCards county={agg.name} keys={['elderlyOnly', 'naturalChange', 'migration']} />

            <h2 className="section__subheading" id="gazdasag">{t('county.part.economy')}</h2>
            <p className="section__explain">{t('county.partLead.economy')}</p>
            <CountyCards county={agg.name} keys={['income', 'jobseekers', 'employed', 'degree', 'noDigital', 'poorHousing']} />
            <CountyTrends county={agg.name} />

            <h2 className="section__subheading" id="egeszseg">{t('county.part.health')}</h2>
            <p className="section__explain">{t('county.partLead.health')}</p>
            <CountyCards county={agg.name} keys={['avoidable', 'amenable', 'allCause']} />
            <p className="section__source">{t('outcomes.district.source')}</p>

            <h2 className="section__subheading" id="jarasai">{t(agg.name === 'Budapest'
              ? 'outcomes.county.districtsHeadingCapital' : 'outcomes.county.districtsHeading', { county: agg.name })}</h2>
            <p className="section__explain">{t(agg.name === 'Budapest' ? 'county.districtsExplainCapital' : 'county.districtsExplain')}</p>
            <CountyDistricts county={agg.name} />

            <h2 className="section__subheading" id="telepulesek">
              {t('county.tableHeading', { county: agg.name })}
            </h2>
            <p className="section__explain">{t('county.tableExplain')} {t('county.caveat')}</p>
            {filter && (
              <p className="county-filter">
                {t('county.filtered', {
                  branch: t(`kinds.${filter.branch}.label`).toLowerCase(),
                  state: t(`county.state.${filter.state || 'absent'}`).toLowerCase(),
                  n: formatNumber(rows.length),
                })}
                <button type="button" onClick={() => setFilter(null)}>
                  {t('county.clearFilter')}
                </button>
              </p>
            )}
            <div className="table-sort">
              <SegmentedControl<SortKey> size="xs" className="segc--stack segc--full"
                value={sort} onChange={(v) => { setSort(v); setShowAll(false); }}
                options={(['band', 'population', 'name', 'gpMin', 'oncallMin'] as const).map((k) => ({
                  value: k, label: t(`county.sort.${k}`) }))} />
            </div>
            {/* how many rows show, and the button for the rest, at the
                table's top right */}
            <div className="table-tools">
              <span>{t('county.rowsShown', { n: formatNumber(shownRows.length), of: formatNumber(rows.length) })}</span>
              {rows.length > FIRST_ROWS && (
                <button type="button" className="data-btn" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? t('county.showFirst', { n: FIRST_ROWS })
                    : t('county.showAll', { n: formatNumber(rows.length) })}
                </button>
              )}
            </div>
            <div className="table-wrap">
              <table className="info-table county-table">
                <thead>
                  <tr>
                    <th>{t('county.thSettlement')}</th>
                    <th className="is-num">{t('county.thPopulation')}</th>
                    <th>{t('county.thGp')}</th>
                    <th>{t('county.thDental')}</th>
                    <th className="is-num">{t('county.thGpMin')}</th>
                    <th className="is-num">{t('county.thOncall')}</th>
                    <th>{t('county.thBand')}</th>
                  </tr>
                </thead>
                <tbody>
                  {shownRows.map((r) => (
                    // the whole row leads to the settlement; the name stays a
                    // real link for the keyboard and for a new tab
                    <tr key={r.slug} className="is-link" onClick={(e) => {
                      if ((e.target as HTMLElement).closest('a')) return;
                      window.location.href = settlementHref(r.slug);
                    }}>
                      <td><a href={settlementHref(r.slug)}>{r.name}</a></td>
                      <td className="is-num">{formatNumber(r.population)}</td>
                      <td><StateDot state={r.gp} /></td>
                      <td><StateDot state={r.dental} /></td>
                      <td className="is-num">{minutes(r.gpMin)}</td>
                      <td className="is-num">{minutes(r.oncallMin)}</td>
                      <td>{r.band ? t(`county.band.${r.band}`) : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* the county among the twenty, one measure at a time */}
            <h2 className="section__subheading" id="osszehasonlitas">{t('county.part.compare')}</h2>
            <p className="section__explain">{t('county.partLead.compare')}</p>
            <CountyMeasureRanking county={agg.name} />
          </>
        )}
      </section>
      {/* how often a district changes physician — the archive's own answer */}
      <CountyChurn county={county} />
      {/* where every county stands, which is the question this page answers
          one row at a time */}
      <CountyRanking />
      <section className="section section--next container">
        <NextSteps items={NEXT} />
      </section>
      <Footer />
    </>
  );
}
