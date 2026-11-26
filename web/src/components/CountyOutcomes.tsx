// The outcome measures on the county page, one theme at a time.
//
// They used to stand in one block under "Egészség és életkörülmények": nine
// rankings of all twenty counties side by side, some 1500 pixels of lists.
// Now each theme of the page asks for its own measures as cards — the
// county's value, a strip of the twenty with the median marked, and its place
// counted from the worst end — and one ranking, with a measure picker, keeps
// the full list of twenty under "A megye a többi mellett". Nothing is computed
// differently; only where it stands has changed.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { t } from '../lib/i18n';
import { formatDecimal, formatPercent } from '../lib/format';
import { competitionRank } from '../lib/rank';
import { districtHref, metaOf, useOutcomes, valueOf, type OutcomeCounty, type OutcomesRaw } from '../lib/outcomes';
import { StripYardstick } from './charts/StripYardstick';
import { TrendLines } from './charts/TrendLines';
import { PageLink } from './PageLink';
import { SegmentedControl } from './SegmentedControl';

export type CountyMeasure = 'avoidable' | 'amenable' | 'allCause' | 'income' | 'jobseekers'
  | 'naturalChange' | 'migration' | 'elderlyOnly' | 'degree' | 'employed' | 'noDigital'
  | 'poorHousing' | 'sboMinutes' | 'gpRateIn12';

/** the measures of the comparison, by theme, in the order of the page */
const MEASURE_GROUPS: readonly (readonly [string, readonly CountyMeasure[]])[] = [
  ['care', ['gpRateIn12', 'sboMinutes']],
  ['people', ['naturalChange', 'migration', 'avoidable']],
  ['economy', ['income', 'jobseekers', 'degree', 'noDigital']],
];

const valueIn = (c: OutcomeCounty, k: CountyMeasure) => c[k] as number | null;

/** 1 = the worst of the twenty, counted in the direction the measure is bad. */
function placeOf(o: OutcomesRaw, k: CountyMeasure, value: number) {
  const meta = metaOf(k);
  const vals = o.counties.map((c) => valueIn(c, k)).filter((v): v is number => v !== null);
  return {
    rank: competitionRank(vals, value, meta.direction === 'higherWorse' ? 'higherFirst' : 'lowerFirst'),
    of: vals.length,
  };
}

function median(vals: number[]): number | null {
  if (!vals.length) return null;
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** One measure as a card: the county among the twenty. */
function Card({ o, c, k }: { o: OutcomesRaw; c: OutcomeCounty; k: CountyMeasure }) {
  const meta = metaOf(k);
  const value = valueIn(c, k);
  const vals = o.counties.map((x) => valueIn(x, k)).filter((v): v is number => v !== null);
  const mid = median(vals);
  const place = value !== null ? placeOf(o, k, value) : null;
  const tone = place ? (place.rank <= place.of / 4 ? ' is-bad' : place.rank > (3 * place.of) / 4 ? ' is-good' : '') : '';
  return (
    <article className={`yard-card${tone}`}>
      <h3>{t(`outcomes.measure.${k}`)}</h3>
      <div className="yard-card__value">{value === null ? '–' : meta.format(value)}</div>
      <StripYardstick values={vals} value={value} median={mid}
        higherWorse={meta.direction === 'higherWorse'} mid={meta.mid} />
      <p className="yard-card__compare">
        {mid !== null && <span>{t('county.median')}: <b>{meta.format(mid)}</b></span>}
      </p>
      {place && <p className="yard-card__rank">{t('outcomes.county.place', place)}</p>}
    </article>
  );
}

/**
 * The cards of one theme. `lead` and `trail` go into the same grid before and
 * after them: the access part puts the drive times and the emergency points
 * there, which come from the counties file, not this one.
 */
export function CountyCards({ county, keys, lead, trail }: {
  county: string; keys: readonly CountyMeasure[]; lead?: ReactNode; trail?: ReactNode;
}) {
  const o = useOutcomes();
  const c = o?.counties.find((x) => x.name === county);
  return (
    <div className="yard-grid">
      {lead}
      {o && c && keys.map((k) => <Card key={k} o={o} c={c} k={k} />)}
      {trail}
    </div>
  );
}

/**
 * Today's count, the one expected in twelve months, and the 90% band around
 * it, on a scale that spans only them (with a margin): from zero most of the
 * track was empty and said nothing. The path month by month was a gently
 * rising line with labels too small to read; the two numbers and the band
 * are what it said.
 */
function ForecastRange({ now, later, band }: { now: number; later: number; band: [number, number] }) {
  const min = Math.min(band[0], now, later);
  const max = Math.max(band[1], now, later);
  const pad = Math.max(1, (max - min) * 0.25);
  const lo = Math.max(0, Math.floor(min - pad));
  const top = Math.ceil(max + pad);
  const at = (v: number) => `${((v - lo) / (top - lo || 1)) * 100}%`;
  const fmt = (v: number) => formatDecimal(Number.isInteger(v) ? String(v) : v.toFixed(1));
  return (
    <div className="fc-range" role="img" aria-label={t('outcomes.forecast.pathAria', { now: fmt(now), later: fmt(later) })}>
      <div className="fc-range__track">
        <span className="fc-range__band" style={{ left: at(band[0]), width: `calc(${at(band[1])} - ${at(band[0])})` }} />
        <span className="fc-range__mark fc-range__mark--now" style={{ left: at(now) }} />
        <span className="fc-range__mark fc-range__mark--later" style={{ left: at(later) }} />
      </div>
      <div className="fc-range__labels">
        <span style={{ left: at(now) }}>{t('outcomes.forecast.now')}: <b>{fmt(now)}</b></span>
        <span style={{ left: at(later) }}>{t('outcomes.forecast.later')}: <b>{fmt(later)}</b></span>
      </div>
      <div className="fc-range__axis"><span>{lo}</span><span>{top}</span></div>
    </div>
  );
}

/** The next twelve months of GP vacancies, and the settlement grants by year:
 *  two cards, each with its figure on the left and what it means listed on
 *  the right, the link to the method under the list. */
export function CountyForecastGrants({ county }: { county: string }) {
  const o = useOutcomes();
  if (!o) return null;
  const fc = o.forecast.kinds.gp.counties[county];
  const grantRows = (() => {
    const by = new Map<number, [number, number]>();
    for (const w of o.grants.kinds.gp.winners) {
      if (w.county !== county || w.programme !== 'settle' || !w.contract) continue;
      const [n, f] = by.get(w.year) ?? [0, 0];
      by.set(w.year, [n + 1, f + (w.status === 'filled' ? 1 : 0)]);
    }
    return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([y, [n, f]]) => [y, n, f] as const);
  })();
  const grantMax = Math.max(1, ...grantRows.map((r) => r[1]));
  const grantTotal = grantRows.reduce((a, r) => a + r[1], 0);
  const grantFilled = grantRows.reduce((a, r) => a + r[2], 0);
  const dec = (v: number) => formatDecimal(v.toFixed(1));
  return (
    <div className="county-cards county-cards--fill" id="elorejelzes">
      {fc && (
        <article className="county-card county-card--wide dev-card">
          <div className="dev-card__main">
            <h3 className="outcome__sub dev-card__title">{t('outcomes.county.forecastHeading')}</h3>
            {/* two figures, each with its own word, rather than an arrow */}
            <div className="fc-pair">
              <div><div className="stat__value">{formatDecimal(String(fc.vacantNow))}</div>
                <div className="fc-pair__when">{t('outcomes.forecast.now')}</div></div>
              <div className="is-later"><div className="stat__value">{dec(fc.vacantIn12)}</div>
                <div className="fc-pair__when">{t('county.forecastLater')}</div></div>
            </div>
            <div className="stat__label">{t('county.forecastValue', { n: formatDecimal(String(fc.districts)) })}</div>
            <ForecastRange now={fc.vacantNow} later={fc.vacantIn12} band={fc.vacantIn12Band} />
          </div>
          <div className="dev-card__side">
            <dl className="dev-card__facts">
              <div><dt>{t('county.forecastFacts.new')}</dt><dd><b>{dec(fc.expectedNew)}</b></dd></div>
              <div><dt>{t('county.forecastFacts.refills')}</dt><dd><b>{dec(fc.expectedRefills)}</b></dd></div>
              <div><dt>{t('county.forecastFacts.band')}</dt>
                <dd><b>{dec(fc.vacantIn12Band[0])}–{dec(fc.vacantIn12Band[1])}</b></dd></div>
              {fc.rateNow !== null && (
                <div><dt>{t('county.forecastFacts.rateNow')}</dt><dd><b>{formatPercent(fc.rateNow)}</b></dd></div>
              )}
              {fc.rateIn12 !== null && (
                <div><dt>{t('county.forecastFacts.rateLater')}</dt><dd><b>{formatPercent(fc.rateIn12)}</b></dd></div>
              )}
            </dl>
            <PageLink href="elemzo.html#elorejelzes">{t('outcomes.county.forecastLink')}</PageLink>
          </div>
        </article>
      )}
      <article className="county-card county-card--wide dev-card">
        <div className="dev-card__main">
          <h3 className="outcome__sub dev-card__title">{t('outcomes.county.grantsHeading')}</h3>
          {grantRows.length ? (
            <ul className="county-grants">
              {grantRows.map(([year, n, filled]) => (
                <li key={year}><b>{year}</b><span className="county-grants__track">
                  <i style={{ width: `${(n / grantMax) * 100}%` }} />
                  <i className="is-filled" style={{ width: `${(filled / grantMax) * 100}%` }} />
                </span><span>{t('outcomes.county.grantsRow', { n, filled })}</span></li>
              ))}
            </ul>
          ) : <p className="outcome__hint">{t('outcomes.county.grantsNone')}</p>}
        </div>
        <div className="dev-card__side">
          {grantRows.length > 0 && (
            <dl className="dev-card__facts">
              <div><dt>{t('county.grantsFacts.total')}</dt><dd><b>{grantTotal}</b></dd></div>
              <div><dt>{t('county.grantsFacts.filled')}</dt>
                <dd><b>{grantFilled}</b> <small>({formatPercent(grantFilled / grantTotal)})</small></dd></div>
            </dl>
          )}
          <PageLink href="elemzo.html#tamogatasok">{t('outcomes.district.grantsLink')}</PageLink>
        </div>
      </article>
    </div>
  );
}

/** Jobseekers against the country, income against the median járás: one height. */
export function CountyTrends({ county }: { county: string }) {
  const o = useOutcomes();
  if (!o) return null;
  const jobs = o.series.jobseekers.counties[county];
  const inc = o.series.incomePerResident;
  const incCounty = inc.counties[county];
  const incomeIndex = incCounty?.map((v, i) => (v !== null && inc.medianDistrict[i]
    ? (100 * v) / (inc.medianDistrict[i] as number) : null));
  if (!jobs && !incomeIndex) return null;
  return (
    <div className="outcome__pair outcome__pair--even">
      {jobs && (
        <div>
          <h3 className="outcome__sub">{t('outcomes.county.jobsHeading')}</h3>
          <TrendLines labels={o.series.jobseekers.months}
            series={[{ key: county, label: county, values: jobs }]}
            reference={{ key: 'hu', label: t('outcomes.national'), values: o.series.jobseekers.national }}
            focus={county} format={(v) => `${formatDecimal(v.toFixed(1))}%`} />
        </div>
      )}
      {incomeIndex && (
        <div>
          <h3 className="outcome__sub">{t('outcomes.county.incomeHeading')}</h3>
          <TrendLines labels={inc.years}
            series={[{ key: county, label: county, values: incomeIndex }]}
            reference={{ key: 'median', label: t('outcomes.medianDistrict'), values: inc.years.map(() => 100) }}
            focus={county} format={(v) => `${Math.round(v)}%`} minSpan={40} />
        </div>
      )}
    </div>
  );
}

type DistrictCol = 'name' | 'gpRate' | 'avoidable' | 'income' | 'jobseekers' | 'migration' | 'degree';

/**
 * The county's járás side by side: every header sorts its column (the worst
 * end first, names A to Z), a second click turns it round, and a row leads to
 * the járás page. Short headers, the full name in the tooltip, so the table
 * fits the page.
 */
export function CountyDistricts({ county }: { county: string }) {
  const o = useOutcomes();
  const [sort, setSort] = useState<{ key: DistrictCol; dir: 'asc' | 'desc' }>({ key: 'avoidable', dir: 'desc' });
  if (!o) return null;
  // the capital's 23 kerület stand where a county's járás would; a kerület
  // has no income or migration of its own, so the capital shows its degree
  const capital = county === 'Budapest';
  const cols: DistrictCol[] = ['gpRate', 'avoidable', ...(capital ? [] : ['income'] as const),
    'jobseekers', capital ? 'degree' : 'migration'];
  const worseHigh = (k: DistrictCol) => k !== 'name' && metaOf(k).direction === 'higherWorse';
  const collator = new Intl.Collator('hu');
  const rows = o.districts.filter((d) => d.county === county).sort((a, b) => {
    const sign = sort.dir === 'asc' ? 1 : -1;
    if (sort.key === 'name') return sign * collator.compare(a.name, b.name);
    const va = valueOf(a, sort.key); const vb = valueOf(b, sort.key);
    if (va === null || vb === null) return (va === null ? 1 : 0) - (vb === null ? 1 : 0);
    return sign * (va - vb);
  });
  const sortBy = (key: DistrictCol) => setSort((s) => (s.key === key
    ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
    : { key, dir: key === 'name' ? 'asc' : worseHigh(key) ? 'desc' : 'asc' }));
  const head = (key: DistrictCol, label: string, full: string, num: boolean) => {
    const on = sort.key === key;
    return (
      <th key={key} className={num ? 'is-num' : undefined}
        aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className={`th-sort${on ? ' is-on' : ''}`} onClick={() => sortBy(key)}
          title={t('county.sortBy', { col: full })}>
          <span>{label}</span>
          <span className="th-sort__arrow" aria-hidden="true">{on ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
        </button>
      </th>
    );
  };
  const nameLabel = t(capital ? 'outcomes.county.colKerulet' : 'outcomes.county.colDistrict');
  return (
    <>
      <div className="table-wrap">
        <table className="info-table county-table outcome-table">
          <thead>
            <tr>
              {head('name', nameLabel, nameLabel, false)}
              {cols.map((k) => head(k, t(`county.measureShort.${k}`), t(`outcomes.measure.${k}`), true))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.slug} className="is-link"
                onClick={(e) => { if (!(e.target as HTMLElement).closest('a')) window.location.href = districtHref(d.name); }}>
                <td className="outcome-table__name"><a href={districtHref(d.name)}>{d.name}</a></td>
                {cols.map((k) => {
                  const v = valueOf(d, k);
                  return <td key={k} className="is-num">{v === null ? '–' : metaOf(k).format(v)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {capital && <p className="outcome__hint">{t('outcomes.living.capitalWide')}</p>}
    </>
  );
}

/**
 * All twenty counties on one measure, the county lit up — one ranking with a
 * measure picker instead of nine lists side by side. The picker is grouped by
 * the page's themes; a group whose measure is not the chosen one shows
 * nothing lit (segc--none).
 */
export function CountyMeasureRanking({ county }: { county: string }) {
  const o = useOutcomes();
  const [k, setK] = useState<CountyMeasure>('avoidable');
  // When the measure changes the rows glide to their new place and the bars
  // grow or shrink from their old length (FLIP: the old position and width
  // are remembered, the new ones laid out, and each row animated from the
  // first to the second). The list stays in rank order underneath, so a
  // screen reader reads it as it is shown.
  const listRef = useRef<HTMLOListElement>(null);
  const before = useRef(new Map<string, { top: number; left: string; width: string }>());
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const items = [...list.children] as HTMLElement[];
    for (const li of items) {
      const was = before.current.get(li.dataset.key ?? '');
      const bar = li.querySelector<HTMLElement>('.county-rank__track i');
      if (still || !was || !bar) continue;
      const dy = was.top - li.offsetTop;
      const left = bar.style.left; const width = bar.style.width;
      li.style.transition = 'none'; li.style.transform = `translateY(${dy}px)`;
      bar.style.transition = 'none'; bar.style.left = was.left; bar.style.width = was.width;
      void li.offsetHeight;
      li.style.transition = ''; li.style.transform = '';
      bar.style.transition = ''; bar.style.left = left; bar.style.width = width;
    }
    before.current = new Map(items.map((li) => {
      const bar = li.querySelector<HTMLElement>('.county-rank__track i');
      return [li.dataset.key ?? '', { top: li.offsetTop, left: bar?.style.left ?? '0%', width: bar?.style.width ?? '0%' }];
    }));
  }, [k, o]);
  if (!o) return null;
  const meta = metaOf(k);
  const rows = o.counties.filter((c) => valueIn(c, k) !== null)
    .sort((a, b) => {
      const d = (valueIn(b, k) as number) - (valueIn(a, k) as number);
      return meta.direction === 'higherWorse' ? d : -d;
    });
  const vals = rows.map((r) => valueIn(r, k) as number);
  const lo = Math.min(0, ...vals); const hi = Math.max(0, ...vals);
  const pos = (v: number) => ((v - lo) / (hi - lo || 1)) * 100;
  const here = rows.find((r) => r.name === county);
  const rank = here ? placeOf(o, k, valueIn(here, k) as number) : null;
  return (
    <>
      <div className="measure-picker" role="group" aria-label={t('county.part.compare')}>
        {MEASURE_GROUPS.map(([group, keys]) => (
          <div key={group} className="measure-picker__group">
            <span className="measure-picker__label">{t(`county.measureGroup.${group}`)}</span>
            <SegmentedControl<string> size="xs" className="segc--stack" fit ariaLabel={t(`county.measureGroup.${group}`)}
              value={keys.includes(k) ? k : ''} onChange={(v) => setK(v as CountyMeasure)}
              options={keys.map((m) => ({ value: m, label: t(`county.measureShort.${m}`),
                title: t(`outcomes.measure.${m}`) }))} />
          </div>
        ))}
      </div>
      <article className="county-rank county-rank--single">
        <h3>{t(`outcomes.measure.${k}`)}</h3>
        {rank && <p className="county-rank__place">{t('outcomes.county.place', rank)}</p>}
        <ol ref={listRef} className="county-rank__moving">
          {rows.map((r) => {
            const v = valueIn(r, k) as number;
            const left = Math.min(pos(0), pos(v)); const width = Math.abs(pos(v) - pos(0));
            return (
              <li key={r.name} data-key={r.name} className={r.name === county ? 'is-on' : ''}>
                <span className="county-rank__name">{r.name}</span>
                <span className="county-rank__track">
                  <i style={{ left: `${left}%`, width: `${Math.max(width, 0.8)}%` }} />
                </span>
                <b>{meta.format(v)}</b>
              </li>
            );
          })}
        </ol>
      </article>
    </>
  );
}
