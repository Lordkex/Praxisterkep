// "A legveszélyeztetettebb járások" — where care is hardest to reach.
//
// The ranking is lib/vulnerability's: four access measures, each a
// percentile among the 174 rural járás, averaged. Every row shows the four
// ranks as bars, so a place is never "at risk" without saying why; under the
// list, two numbers say what goes with it — the avoidable mortality and the
// income of these járás against the rest.
import { useMemo, useState } from 'react';
import { t } from '../lib/i18n';
import { formatNumber } from '../lib/format';
import { SegmentedControl } from './SegmentedControl';
import { districtHref, metaOf, useOutcomes } from '../lib/outcomes';
import { competitionRank } from '../lib/rank';
import { ACCESS_FACTORS, meanOf, rankVulnerable, type AccessFactor, type Vulnerable } from '../lib/vulnerability';

const SHOWN = [10, 20, 30] as const;

type SortKey = 'district' | AccessFactor | 'score';
type Sort = { key: SortKey; dir: 'asc' | 'desc' };
const DEFAULT_SORT: Sort = { key: 'score', dir: 'desc' };
const collator = new Intl.Collator('hu');

function sortValue(v: Vulnerable, key: Exclude<SortKey, 'district'>): number {
  return key === 'score' ? v.score : (v.district[key] as number);
}

/** The shown rows in the order the header asks for; ties keep the ranking. */
function sortRows(rows: Vulnerable[], { key, dir }: Sort): Vulnerable[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const c = key === 'district'
      ? collator.compare(a.district.name, b.district.name)
      : sortValue(a, key) - sortValue(b, key);
    return sign * c || b.score - a.score;
  });
}

export function VulnerableDistricts() {
  const o = useOutcomes();
  const [n, setN] = useState<(typeof SHOWN)[number]>(20);
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const ranked = useMemo(() => (o ? rankVulnerable(o.districts) : []), [o]);
  if (!o || !ranked.length) return null;
  const top = ranked.slice(0, n);
  const rest = ranked.slice(n).map((v) => v.district);
  const topRows = top.map((v) => v.district);
  const people = topRows.reduce((a, d) => a + d.population, 0);
  const scores = ranked.map((v) => v.score);
  const cmp = (key: 'avoidable' | 'income' | 'jobseekers') => ({
    top: meanOf(topRows, (d) => d[key]), rest: meanOf(rest, (d) => d[key]),
  });
  const avoid = cmp('avoidable');
  const income = cmp('income');
  const jobs = cmp('jobseekers');
  const rows = sortRows(top, sort);
  // a new column starts with its worst end (or A to Z for the names); the
  // same column again turns the order round
  const sortBy = (key: SortKey) => setSort((s) => (s.key === key
    ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
    : { key, dir: key === 'district' ? 'asc' : 'desc' }));
  const head = (key: SortKey, label: string) => {
    const on = sort.key === key;
    return (
      <button key={key} type="button" className={`vulnerable__sort${on ? ' is-on' : ''}`}
        onClick={() => sortBy(key)} aria-pressed={on} title={t('vulnerable.col.sort', { col: label })}>
        <span>{label}</span>
        <span className="vulnerable__arrow" aria-hidden="true">{on ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
    );
  };

  return (
    <section className="section container outcome" id="veszelyeztetett">
      <h2 className="section__heading">{t('vulnerable.heading')}</h2>
      <p className="section__lead">{t('vulnerable.lead')}</p>
      <div className="outcome__switch">
        <SegmentedControl<string> size="xs" ariaLabel={t('vulnerable.shown')}
          value={String(n)} onChange={(v) => setN(Number(v) as (typeof SHOWN)[number])}
          options={SHOWN.map((k) => ({ value: String(k), label: t('vulnerable.top', { n: k }) }))} />
      </div>

      <div className="outcome__kpis">
        <div><b>{formatNumber(people)}</b><span>{t('vulnerable.kpi.people', { n })}</span></div>
        {avoid.top !== null && avoid.rest !== null && (
          <div><b>{formatNumber(Math.round(avoid.top))}</b>
            <span>{t('vulnerable.kpi.avoidable', { rest: formatNumber(Math.round(avoid.rest)) })}</span></div>
        )}
        {income.top !== null && income.rest !== null && (
          <div><b>{metaOf('income').format(income.top)}</b>
            <span>{t('vulnerable.kpi.income', { rest: metaOf('income').format(income.rest) })}</span></div>
        )}
        {jobs.top !== null && jobs.rest !== null && (
          <div><b>{metaOf('jobseekers').format(jobs.top)}</b>
            <span>{t('vulnerable.kpi.jobs', { rest: metaOf('jobseekers').format(jobs.rest) })}</span></div>
        )}
      </div>

      <div className="vulnerable">
        <div className="vulnerable__head">
          {head('district', t('vulnerable.col.district'))}
          {ACCESS_FACTORS.map((k) => head(k, t(`vulnerable.factor.${k}`)))}
          {head('score', t('vulnerable.col.score'))}
        </div>
        {rows.map((v) => (
          <a key={v.district.slug} className="vulnerable__row" href={districtHref(v.district.name)}>
            <span className="vulnerable__name"><em>{competitionRank(scores, v.score, 'higherFirst')}.</em> {v.district.name}
              <small>{v.district.county}</small></span>
            {ACCESS_FACTORS.map((k) => {
              const raw = v.district[k] as number;
              return (
                <span key={k} className="vulnerable__cell" title={`${t(`vulnerable.factor.${k}`)}: ${metaOf(k).format(raw)}`}>
                  <b>{metaOf(k).format(raw)}</b>
                  <span className="vulnerable__track"><i style={{ width: `${Math.max(4, v.ranks[k] * 100)}%` }} /></span>
                </span>
              );
            })}
            <span className="vulnerable__score">{formatNumber(Math.round(v.score * 100))}</span>
          </a>
        ))}
      </div>
      <p className="section__explain">{t('vulnerable.how')}</p>
      <p className="section__source">{t('vulnerable.source')}</p>
    </section>
  );
}
