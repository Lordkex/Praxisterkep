// "Járás" (jaras.html) — the level between a county and a town.
//
// A county has one vacancy rate; its járás have as many as there are járás,
// and they are not the same country. This page is that resolution: the whole
// country painted at 197 shapes, where one of them stands among the others,
// and what its own settlements look like underneath.
import { useMemo, useState } from 'react';
import { t } from '../lib/i18n';
import { formatDecimal, formatNumber, formatPercent, huArticle } from '../lib/format';
import { useContextStore } from '../lib/context';
import { useHashScroll } from '../lib/useHashScroll';
import { settlementHref } from '../lib/settlementLink';
import {
  MEASURES, districtOf, per10k, rankOf, settlementRows, useDistricts,
  vacancyRate,
  type Band, type DistrictRow, type Measure, type SettlementRow, type State,
} from '../lib/districts';
import { AGE_COLORS, type AgeKey } from './charts/AgePie';
import { Donut, DonutLegend } from './charts/Donut';
import { DistrictMap } from './charts/DistrictMap';
import { DistrictRanking } from './charts/DistrictRanking';
import { DistrictScatter, type ScatterX } from './charts/DistrictScatter';
import { DistrictOutcomes } from './DistrictOutcomes';
import { useOutcomes } from '../lib/outcomes';
import { DistrictDistribution } from './charts/DistrictDistribution';
import { CompareBars, ScaleMark, ShareDots } from './charts/DistrictFigures';
import { IconBusOff } from './icons';
import { PageNav } from './PageNav';
import { SegmentedControl } from './SegmentedControl';
import { SideNav } from './SideNav';
import { sideGroups } from '../lib/sideGroups';
import { NextSteps } from './NextSteps';
import { Headline } from './Headline';
import { Footer } from './Footer';
import { PdfButton } from './PdfButton';
import { DistrictStory } from './story/PageStories';
import { VulnerableDistricts } from './VulnerableDistricts';

const DISTRICT_GROUPS = sideGroups('district');
// the comparison's measures by theme, in the order of the page's sections
const MEASURE_GROUPS: readonly (readonly [string, readonly string[]])[] = [
  ['care', ['gpVacancy', 'dentalVacancy', 'index']],
  ['access', ['gpMin', 'oncallMin']],
  ['society', ['development', 'lagging', 'ageing']],
];

const NEXT = [
  { href: 'megye.html', titleKey: 'next.county.title', textKey: 'next.county.text' },
  { href: 'telepules/', titleKey: 'next.settlement.title',
    textKey: 'next.settlement.text' },
  { href: 'elemzo.html', titleKey: 'next.analysis.title', textKey: 'next.analysis.text' },
] as const;

type SortKey = 'name' | 'population' | 'band' | 'gpMin' | 'oncallMin';
const BAND_ORDER: Record<Band, number> = {
  kiemelt: 0, magas: 1, kozepes: 2, alacsony: 3, '': 4,
};

/** How a measure writes a value: a share, a number of minutes, or a score. */
function measureFormat(measure: Measure): (value: number) => string {
  if (measure.key === 'development' || measure.key === 'index') {
    return (v) => formatDecimal(v.toFixed(1));
  }
  if (measure.key.endsWith('Min')) return (v) => minutes(v);
  return (v) => formatPercent(v);
}

function minutes(value: number | null): string {
  return value === null ? '–' : t('county.minutes', { n: formatDecimal(value.toFixed(1)) });
}

function StateDot({ state }: { state: State }) {
  return (
    <span className={`county-dot county-dot--${state || 'absent'}`}
      title={t(`county.state.${state || 'absent'}`)} />
  );
}

const AGE_KEYS: readonly AgeKey[] = ['young', 'working', 'old'];
// the three rings of the state cards: one size, one ring width
const RING = 130;
const RING_W = 20;


/**
 * The drive times and the places of care, as cards beside the outcome ones.
 * They come from the districts file, which carries no strip or rank for
 * them, so they show the figure alone. "drive" goes before the emergency
 * department card, "places" after it.
 */
function AccessCards({ d, which }: { d: DistrictRow; which: 'drive' | 'places' }) {
  if (which === 'drive') {
    const drive = [['gp', d.medianGpMinutes], ['oncall', d.medianOncallMinutes],
      ['inpatient', d.medianInpatientMinutes]] as const;
    return drive.map(([k, v]) => (
      <article key={k} className="yard-card">
        <h3>{t(`district.access.${k}`)}</h3>
        <div className="yard-card__value">{minutes(v)}</div>
        <p className="yard-card__rank">{t('district.access.driveNote')}</p>
      </article>
    ));
  }
  return (
    <>
      <article className="yard-card">
        <h3>{t('district.access.bus')}</h3>
        {/* the struck-through bus beside the count, and every settlement as a
            dot under it, the ones without a direct bus lit */}
        <div className="yard-card__iconvalue">
          <span className="yard-card__icon" aria-hidden="true"><IconBusOff /></span>
          <div className="yard-card__value">{formatNumber(d.withoutDirectBus)}</div>
        </div>
        <p className="yard-card__rank">{t('district.access.busNote', {
          n: formatNumber(d.settlements) })}</p>
        <ShareDots total={d.settlements} marked={d.withoutDirectBus} max={500} dense={d.settlements > 120}
          title={t('district.access.busDots', { n: formatNumber(d.withoutDirectBus), of: formatNumber(d.settlements) })} />
      </article>
      <article className="yard-card">
        <h3>{t('district.access.sites')}</h3>
        <ul className="yard-card__facts">
          <li><b>{formatNumber(d.oncallPoints)}</b> {t('district.access.oncallPoints')}</li>
          <li><b>{formatNumber(d.ambulanceStations)}</b> {t('district.access.ambulance')}</li>
          <li><b>{formatNumber(d.pharmacies)}</b> {t('district.access.pharmacies')}</li>
        </ul>
      </article>
    </>
  );
}

/** One line of plain Hungarian about where this járás stands. */
function Verdict({ data, d }: { data: ReturnType<typeof useDistricts>; d: DistrictRow }) {
  const branch = useContextStore((s) => s.kind);
  const rate = vacancyRate(d, branch);
  const national = rankOf(data, d.name, (x) => vacancyRate(x, branch));
  const inCounty = rankOf(data, d.name, (x) => vacancyRate(x, branch), d.county);
  const travel = rankOf(data, d.name, (x) => x.medianGpMinutes);
  if (rate === null || !national) return null;
  const half = rate > national.median ? 'worse' : 'better';
  return (
    <p className="district-verdict">
      {t(`district.verdict.${half}`, {
        name: d.name,
        branch: t(`kinds.${branch}.adj`),
        rate: formatPercent(rate),
        art: huArticle(national.rank),
        rank: String(national.rank),
        of: String(national.of),
        median: formatPercent(national.median),
      })}
      {inCounty && inCounty.of > 1 && ` ${t('district.verdict.county', {
        county: d.county,
        art: huArticle(inCounty.rank),
        rank: String(inCounty.rank),
        of: String(inCounty.of),
      })}`}
      {travel && d.medianGpMinutes !== null && ` ${t('district.verdict.travel', {
        n: minutes(d.medianGpMinutes),
        art: huArticle(travel.rank),
        rank: String(travel.rank),
        of: String(travel.of),
      })}`}
    </p>
  );
}

export function DistrictPage() {
  useHashScroll();
  const data = useDistricts();
  const kind = useContextStore((s) => s.kind);
  const setKind = useContextStore((s) => s.setKind);
  const county = useContextStore((s) => s.county);
  const setCounty = useContextStore((s) => s.setCounty);
  const district = useContextStore((s) => s.district);
  const setDistrict = useContextStore((s) => s.setDistrict);
  const [sort, setSort] = useState<SortKey>('band');
  const [ageOn, setAgeOn] = useState<string | null>(null);
  const [gpOn, setGpOn] = useState<string | null>(null);
  const [dentalOn, setDentalOn] = useState<string | null>(null);
  // null: the vacancy of the branch being looked at, until the reader picks
  const [measureKey, setMeasureKey] = useState<string | null>(null);
  const [scatterX, setScatterX] = useState<ScatterX>('travel');

  const d = districtOf(data, district);
  const counties = useMemo(
    () => [...new Set((data?.districts ?? []).map((x) => x.county))].sort(
      (a, b) => a.localeCompare(b, 'hu')),
    [data],
  );
  // the picker lists the járás of the chosen county, or all of them
  const options = useMemo(() => (data?.districts ?? [])
    .filter((x) => !county || x.county === county)
    .sort((a, b) => a.name.localeCompare(b.name, 'hu')), [data, county]);

  const rows = useMemo(() => {
    const list = settlementRows(data, district);
    const by: Record<SortKey, (a: SettlementRow, b: SettlementRow) => number> = {
      name: (a, b) => a.name.localeCompare(b.name, 'hu'),
      population: (a, b) => b.population - a.population,
      band: (a, b) => BAND_ORDER[a.band] - BAND_ORDER[b.band]
        || b.population - a.population,
      gpMin: (a, b) => (b.gpMin ?? -1) - (a.gpMin ?? -1),
      oncallMin: (a, b) => (b.oncallMin ?? -1) - (a.oncallMin ?? -1),
    };
    return [...list].sort(by[sort]);
  }, [data, district, sort]);

  // the map is painted with the branch the reader is looking at
  const values = useMemo(() => new Map(
    (data?.districts ?? [])
      .map((x) => [x.name, vacancyRate(x, kind)] as const)
      .filter((pair): pair is [string, number] => pair[1] !== null),
  ), [data, kind]);

  const pick = (name: string) => {
    const row = districtOf(data, name);
    if (row) setCounty(row.county);
    setDistrict(name);
  };

  const measure = MEASURES.find((m) => m.key === (measureKey
    ?? (kind === 'gp' ? 'gpVacancy' : 'dentalVacancy'))) ?? MEASURES[0];
  const outcomes = useOutcomes();
  const outcomesYear = String(outcomes?.sources.mortality.year ?? '');

  // What this járás is read against. A kerület is not a járás in any sense a
  // reader means — 23 of them share one town — so the capital is compared
  // with itself: its share of Budapest, and its size against an average
  // kerület. Everywhere else the yardstick is the average of the 174 járás,
  // with the kerület left out of that average for the same reason.
  // the range the complex indicator actually lives in, so the mark means
  // something: 45.6 on a 0..100 scale looks middling, on 18.6..84.0 it is not
  const devRange = useMemo(() => {
    const vals = (data?.districts ?? [])
      .map((x) => x.development?.complex)
      .filter((v): v is number => v !== undefined);
    return vals.length
      ? { lo: Math.min(...vals), hi: Math.max(...vals) } : { lo: 0, hi: 100 };
  }, [data]);
  const marks = data?.benchmarks;
  const hectares = (v: number) => t('district.hectares', {
    n: formatNumber(Math.round(v)),
  });
  const bench = !d || !marks ? null : d.isCapital ? [
    ...(marks.capital.populationTotal ? [{
      key: 'pop',
      label: t('district.benchCapitalPopulation'),
      value: d.population,
      reference: marks.capital.populationTotal,
      referenceLabel: t('district.benchCapitalTotal'),
      format: (v: number) => formatNumber(v),
    }] : []),
    ...(d.area && marks.capital.area ? [{
      key: 'area',
      label: t('district.benchArea'),
      value: d.area,
      reference: marks.capital.area,
      referenceLabel: t('district.benchCapitalAverage'),
      format: hectares,
    }] : []),
  ] : [
    ...(marks.jaras.population ? [{
      key: 'pop',
      label: t('district.benchPopulation'),
      value: d.population,
      reference: marks.jaras.population,
      referenceLabel: t('district.benchAverage'),
      format: (v: number) => formatNumber(Math.round(v)),
    }] : []),
    ...(marks.jaras.settlements ? [{
      key: 'settlements',
      label: t('district.benchSettlements'),
      value: d.settlements,
      reference: marks.jaras.settlements,
      referenceLabel: t('district.benchAverage'),
      // the járás's own count is whole ("5", not "5,0"); the average is not
      format: (v: number) => (Number.isInteger(v) ? formatNumber(v)
        : formatDecimal(v.toFixed(v < 10 ? 1 : 0))),
    }] : []),
  ];

  const gpSlices = d?.gpDistricts ? [
    { value: d.gpDistricts.total - d.gpDistricts.vacant - d.gpDistricts.dissolved,
      color: 'var(--good)', label: t('stats.statusFilled') },
    { value: d.gpDistricts.vacant, color: 'var(--bad)', label: t('stats.statusVacant') },
    { value: d.gpDistricts.dissolved, color: 'var(--line-strong)',
      label: t('stats.statusDissolved') },
  ].filter((s) => s.value > 0) : [];
  const dentalSlices = d?.dentalDistricts ? [
    { value: d.dentalDistricts.total - d.dentalDistricts.vacant
      - d.dentalDistricts.dissolved, color: 'var(--good)', label: t('stats.statusFilled') },
    { value: d.dentalDistricts.vacant, color: 'var(--bad)',
      label: t('stats.statusVacant') },
    { value: d.dentalDistricts.dissolved, color: 'var(--line-strong)',
      label: t('stats.statusDissolved') },
  ].filter((s) => s.value > 0) : [];
  // the age split as a ring like the other two, so the three read as one row
  const ageSlices = d?.age ? AGE_KEYS.map((key) => ({
    key, value: d.age![key], color: AGE_COLORS[key], label: t(`age.part.${key}`),
  })) : [];

  return (
    <>
      <PageNav kind={kind} onKind={setKind} />
      <SideNav groups={DISTRICT_GROUPS} labelKey="sideNav.district.label" />
      <section className="section container" id="jaras">
        <div className="heading-row">
          <h1 className="section__heading">{t('district.heading')}</h1>
          {d && <PdfButton level="district" name={d.name} />}
        </div>
        <p className="section__lead">{t('district.lead')}</p>

        <DistrictMap values={values} selected={district} onPick={pick}
          total={data?.districts.length}
          seatOf={(name) => districtOf(data, name)?.seat}
          legendFormat={(v) => formatPercent(v, 0)}
          format={(name, v) => `${name}: ${v === undefined ? '–' : formatPercent(v)}`}
          side={(
            <div className="district-pickers">
              <label className="county-picker">
                <span>{t('county.pick')}</span>
                <select value={county ?? ''} onChange={(e) => setCounty(e.target.value || null)}>
                  <option value="">{t('district.allCounties')}</option>
                  {counties.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="county-picker">
                <span>{t('district.pick')}</span>
                <select value={district ?? ''}
                  onChange={(e) => (e.target.value ? pick(e.target.value) : setDistrict(null))}>
                  <option value="">{t('district.pickNone')}</option>
                  {options.map((x) => (
                    <option key={x.name} value={x.name}>{x.name}</option>
                  ))}
                </select>
              </label>
            </div>
          )} />
        <p className="tp-note">{t('district.mapNote', {
          kind: t(`kinds.${kind}.adj`),
        })}</p>

        <DistrictStory />

        {!data && <p className="loading">…</p>}
        {data && !d && <p className="section__explain">{t('district.nothingPicked')}</p>}

        {d && (
          <>
            {/* the heading and its sentence on the left, the yardstick beside
                them from the heading down: how big this járás is against an
                average one reads with the verdict, not under the age ring */}
            <div className="district-intro">
              <div className="district-intro__text">
                <h2 className="section__subheading" id="allapot">
                  {t('district.stateHeading', { name: d.name })}
                </h2>
                <Verdict data={data} d={d} />
              </div>
              {bench && bench.length > 0 && (
                <div className="district-intro__bench"><CompareBars rows={bench} /></div>
              )}
            </div>

            <div className="county-cards county-cards--fill">
              {/* three rings alike: the figure and its words beside the ring,
                  the legend and the context under both */}
              <article className="county-card county-card--stacked">
                <div className="county-card__head">
                  {d.age && (
                    <div className="county-card__figure">
                      <Donut size={RING} thickness={RING_W} slices={ageSlices}
                        active={ageOn} onActive={setAgeOn}>
                        {/* the share the page worries about: the over-65s */}
                        <span className="donut__stack">
                          <strong>{formatPercent(d.age.old / d.age.total)}</strong>
                          <small>{t('age.part.old')}</small>
                        </span>
                      </Donut>
                    </div>
                  )}
                  <Headline on={ageOn ?? ''} variants={[
                    { key: '', value: formatNumber(d.population),
                      label: t('district.population', { n: formatNumber(d.settlements) }) },
                    ...ageSlices.map((s) => ({
                      key: s.label, value: formatNumber(s.value),
                      label: t('county.ageOf', {
                        group: s.label, share: formatPercent(s.value / d.age!.total),
                      }),
                    })),
                  ]} />
                </div>
                <div className="county-card__body">
                  {d.age && <DonutLegend slices={ageSlices} active={ageOn} onActive={setAgeOn} />}
                  <div className="stat__context">{t('district.seatLine', {
                    seat: d.seat, county: d.county,
                  })}</div>
                </div>
              </article>

              {(['gp', 'dental'] as const).map((branch) => {
                const cell = branch === 'gp' ? d.gpDistricts : d.dentalDistricts;
                const slices = branch === 'gp' ? gpSlices : dentalSlices;
                const on = branch === 'gp' ? gpOn : dentalOn;
                const onActive = branch === 'gp' ? setGpOn : setDentalOn;
                const rate = vacancyRate(d, branch);
                const thin = per10k(d, branch);
                const of = (n: number) => (
                  <>{formatNumber(n)}<span className="stat__of"> / {formatNumber(cell?.total ?? 0)}</span></>
                );
                return (
                  <article className="county-card county-card--stacked" key={branch}>
                    <div className="county-card__head">
                      <div className="county-card__figure">
                        <Donut size={RING} thickness={RING_W} slices={slices}
                          active={on} onActive={onActive}>
                          <strong>{rate === null ? '–' : formatPercent(rate)}</strong>
                        </Donut>
                      </div>
                      <Headline on={on ?? ''} variants={[
                        { key: '', value: of((cell?.vacant ?? 0) + (cell?.dissolved ?? 0)),
                          label: t('district.vacantOf', { branch: t(`kinds.${branch}.adj`) }) },
                        ...slices.map((s) => ({
                          key: s.label, value: of(s.value),
                          label: t('district.sliceOf', {
                            state: s.label.toLowerCase(), branch: t(`kinds.${branch}.adj`),
                          }),
                        })),
                      ]} />
                    </div>
                    <div className="county-card__body">
                      <DonutLegend slices={slices} active={on} onActive={onActive} />
                      {/* two facts, two lines */}
                      {cell?.longTerm ? (
                        <div className="stat__context">{t('district.longTerm', {
                          n: formatNumber(cell.longTerm) })}</div>
                      ) : null}
                      {thin !== null && (
                        <div className="stat__context">{t('district.per10k', {
                          n: formatDecimal(thin.toFixed(2)) })}</div>
                      )}
                    </div>
                  </article>
                );
              })}

            </div>

            {/* Below the summary the page goes theme by theme, each with the
                same cards (value, strip, rural median, county, rank) and the
                one or two charts that belong to it. It used to follow the data
                files instead: fifteen outcome cards in one block, the drive
                times on a card of their own, the national comparison in three
                places, and several numbers two to five times over. */}

            <h2 className="section__subheading" id="ellatas">{t('district.part.care')}</h2>
            <p className="section__explain">{t('district.partLead.care')}</p>
            <DistrictOutcomes name={d.name} part="care" />

            <h2 className="section__subheading" id="elerhetoseg">{t('district.part.access')}</h2>
            <p className="section__explain">{t('district.partLead.access')}</p>
            <DistrictOutcomes name={d.name} part="access"
              lead={<AccessCards d={d} which="drive" />} trail={<AccessCards d={d} which="places" />} />

            <h2 className="section__subheading" id="nepesseg">{t('district.part.people')}</h2>
            <p className="section__explain">{t('district.partLead.people')}</p>
            <DistrictOutcomes name={d.name} part="people" />

            <h2 className="section__subheading" id="gazdasag">{t('district.part.economy')}</h2>
            <p className="section__explain">{t('district.partLead.economy')}</p>
            <h3 className="why__chain-title" id="fejlettseg">{t('district.devHeading')}</h3>
            <p className="section__explain">{t('district.devExplain', {
              year: String(data?.development?.measuredYear ?? ''),
            })}</p>
            {d.development && (
              <div className="county-cards county-cards--fill">
                {/* the figure and its chart on the left, what it means listed
                    on the right in reading size: the grade, the place, the
                    threshold used to sit in small print under the scale */}
                <article className="county-card county-card--wide dev-card">
                  <div className="dev-card__main">
                    <div className="stat__value">{formatDecimal(d.development.complex.toFixed(2))}</div>
                    <div className="stat__label">{t('district.devValue')}</div>
                    <ScaleMark value={d.development.complex}
                      lo={devRange.lo} hi={devRange.hi}
                      threshold={data?.development?.beneficiaryBelow ?? null}
                      thresholdLabel={t('district.devThresholdShort')}
                      format={(v) => formatDecimal(v.toFixed(1))} />
                  </div>
                  <dl className="dev-card__facts">
                    <div>
                      <dt>{t('district.devFacts.grade')}</dt>
                      <dd>{d.development.grade ? (
                        <span className={`dev-badge dev-badge--${d.development.grade}`}>
                          {t(`district.devGrade.${d.development.grade}`)}
                        </span>
                      ) : (
                        <span className="dev-badge dev-badge--none">{t('district.devGrade.none')}</span>
                      )}</dd>
                    </div>
                    {d.development.rank !== null && (
                      <div>
                        <dt>{t('district.devFacts.rank', { of: formatNumber(data?.districts.length ?? 0) })}
                          <small>{t('district.devFacts.rankNote')}</small></dt>
                        <dd><b>{formatNumber(d.development.rank)}.</b></dd>
                      </div>
                    )}
                    {data?.development?.beneficiaryBelow != null && (
                      <div>
                        <dt>{t('district.devFacts.threshold')}
                          <small>{t('district.devFacts.thresholdNote')}</small></dt>
                        <dd><b>{formatDecimal(data.development.beneficiaryBelow.toFixed(2))}</b></dd>
                      </div>
                    )}
                  </dl>
                </article>
                {d.lagging && d.lagging.settlements > 0 && (
                  <article className="county-card county-card--wide dev-card">
                    <div className="dev-card__main">
                      <div className="stat__value">
                        {formatPercent(d.lagging.share)}
                        <span className="stat__of"> · {formatNumber(
                          d.lagging.settlements)} / {formatNumber(d.settlements)}</span>
                      </div>
                      <div className="stat__label">{t('district.laggingLabel')}</div>
                      <ShareDots total={d.settlements}
                        marked={d.lagging.settlements}
                        title={t('district.laggingDots', {
                          n: formatNumber(d.lagging.settlements),
                          of: formatNumber(d.settlements),
                        })} />
                    </div>
                    <div className="dev-card__side">
                    <dl className="dev-card__facts">
                      {(['socio', 'unemployment', 'temporary'] as const).map((k) => (
                        <div key={k}>
                          <dt>{t(`district.laggingFacts.${k}`)}</dt>
                          <dd><b>{formatNumber(d.lagging![k])}</b></dd>
                        </div>
                      ))}
                      {d.lagging.populationShare !== null && (
                        <div>
                          <dt>{t('district.laggingFacts.population')}</dt>
                          <dd><b>{formatPercent(d.lagging.populationShare)}</b></dd>
                        </div>
                      )}
                    </dl>
                    <p className="dev-card__note">{t('district.laggingFacts.overlap')}</p>
                    </div>
                  </article>
                )}
              </div>
            )}
            <p className="extra-note">{t('district.devSource', {
              source: data?.development?.source ?? '',
              benefit: data?.development?.benefitSource ?? '',
            })}</p>
            <h3 className="why__chain-title">{t('district.part.economyCards')}</h3>
            <DistrictOutcomes name={d.name} part="economy" />

            <h2 className="section__subheading" id="egeszseg">{t('district.part.health')}</h2>
            <p className="section__explain">{t('district.partLead.health', {
              year: outcomesYear,
            })}</p>
            <DistrictOutcomes name={d.name} part="health" />

            <h2 className="section__subheading" id="telepulesek">
              {t('district.tableHeading', { name: d.name })}
            </h2>
            <p className="section__explain">{t('county.tableExplain')}</p>
            <table className="info-table">
              <tbody>
                <tr>
                  <th>{t('county.gpLine')}</th>
                  <td>{t('county.stateLine', {
                    filled: formatNumber(d.gpFilled),
                    partial: formatNumber(d.gpPartial),
                    vacant: formatNumber(d.gpVacantOnly),
                  })}</td>
                </tr>
                <tr>
                  <th>{t('county.dentalLine')}</th>
                  <td>{t('county.stateLine', {
                    filled: formatNumber(d.dentalFilled),
                    partial: formatNumber(d.dentalPartial),
                    vacant: formatNumber(d.dentalVacantOnly),
                  })}
                    {/* "0 further settlements …" said nothing and still took a line */}
                    {d.dentalAbsent > 0 && <>{' '}<span className="county-note">{t('county.dentalSeats', {
                      n: formatNumber(d.dentalAbsent),
                    })}</span></>}
                  </td>
                </tr>
                <tr>
                  <th>{t('county.bandLine')}</th>
                  <td>{t('county.bandValue', {
                    kiemelt: formatNumber(d.bands.kiemelt ?? 0),
                    magas: formatNumber(d.bands.magas ?? 0),
                  })}{d.medianIndex !== null && ` · ${t('district.medianIndex', {
                    n: formatDecimal(d.medianIndex.toFixed(1)),
                  })}`}</td>
                </tr>
              </tbody>
            </table>
            <div className="table-sort">
              <SegmentedControl<SortKey> size="xs" className="segc--stack segc--full"
                value={sort} onChange={setSort}
                options={(['band', 'population', 'name', 'gpMin', 'oncallMin'] as const).map((k) => ({
                  value: k, label: t(`county.sort.${k}`) }))} />
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
                  {rows.map((r) => (
                    // the whole row leads to the settlement; the name stays a
                    // real link for the keyboard and for a new tab
                    <tr key={r.slug} className={`is-link${r.name === d.seat ? ' is-seat' : ''}`}
                      onClick={(e) => {
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
            <p className="extra-note">{t('district.caveat')}
              {data?.unplaced?.dental ? ` ${t('district.unplaced', {
                n: formatNumber(data.unplaced.dental),
              })}` : ''}
            </p>

            {/* the national comparison closes the járás and leads into the
                national part of the page (the most vulnerable járás after it):
                one measure, read by the distribution and the ranking; it opens
                on the branch being looked at */}
            <h2 className="section__subheading" id="osszehasonlitas">{t('district.part.compare')}</h2>
            <p className="section__explain">{t('district.partLead.compare')}</p>
            {/* eight measures in three themed switches, in the landing's style:
                one row of eight did not fit even a laptop */}
            <div className="measure-picker" role="group" aria-label={t('district.part.compare')}>
              {MEASURE_GROUPS.map(([group, keys]) => (
                <div key={group} className="measure-picker__group">
                  <span className="measure-picker__label">{t(`district.measureGroup.${group}`)}</span>
                  <SegmentedControl<string> size="xs" className="segc--stack" fit
                    ariaLabel={t(`district.measureGroup.${group}`)}
                    value={measure.key} onChange={setMeasureKey}
                    options={keys.map((k) => ({ value: k, label: t(`district.measureShort.${k}`),
                      title: t(`district.measure.${k}`) }))} />
                </div>
              ))}
            </div>
            <h3 className="why__chain-title">{t('district.distHeading')}</h3>
            <p className="section__explain">{t('district.distExplain')}</p>
            <DistrictDistribution rows={data?.districts ?? []}
              measure={measure} selected={d.name} onPick={pick}
              format={measureFormat(measure)} />

            <h3 className="why__chain-title" id="rangsor">{t('district.rankingTitle')}</h3>
            <p className="section__explain">{t('district.rankingExplainMeasure', {
              measure: t(`district.measure.${measure.key}`),
            })}</p>
            <DistrictRanking data={data} measure={measure} format={measureFormat(measure)}
              selected={d.name} onPick={pick} />

            <h3 className="why__chain-title" id="osszefugges">
              {t(`district.scatterHeading.${scatterX}`)}
            </h3>
            {/* both explanations in one cell, the hidden one keeping its room:
                they differ by a line, and the chart under them jumped on
                every switch of the axis */}
            <div className="steady">
              {(['travel', 'development'] as ScatterX[]).map((x) => (
                <p key={x} className={`section__explain${x === scatterX ? '' : ' is-off'}`}
                  aria-hidden={x === scatterX ? undefined : true}>
                  {t(`district.scatterExplain.${x}`)}</p>
              ))}
            </div>
            <div className="map-controls">
              <SegmentedControl<ScatterX> size="xs" value={scatterX} onChange={setScatterX}
                ariaLabel={t(`district.scatterHeading.${scatterX}`)}
                options={(['travel', 'development'] as ScatterX[]).map((x) => ({
                  value: x, label: t(`district.scatterAxis.${x}`) }))} />
            </div>
            <DistrictScatter data={data} branch={kind} selected={d.name}
              onPick={pick} axis={scatterX} />
          </>
        )}
      </section>
      {/* the national comparison above leads straight into the most
          vulnerable járás; where to go next closes the page */}
      <VulnerableDistricts />
      <section className="section section--next container">
        <NextSteps items={NEXT} />
      </section>
      <Footer />
    </>
  );
}
