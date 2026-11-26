// Side-by-side comparison of two counties: headline indicators from the
// current snapshot plus overlaid vacancy-count timelines from the archive.
import { useMemo, useState } from 'react';
import { t } from '../lib/i18n';
import { formatDecimal, formatNumber, formatPercent } from '../lib/format';
import { useAppStore, useHistoryEntries, useSnapshot } from '../store/useAppStore';
import { vacancyOf } from '../lib/vacancy';
import { useContextStore } from '../lib/context';
import type { CountyAggregate } from '../types';

// the middle column is about 500px wide; this height makes the chart as tall
// as the two cards beside it
const W = 500;
const H = 330;
const PAD = { top: 14, right: 40, bottom: 26, left: 36 };
const COLOR_A = 'var(--accent)';
const COLOR_B = 'var(--s5)';

type Row = [string, string];

/**
 * A county's figures in three groups — with the dissolved districts counted,
 * without them, and the county's own size and stock — each opened by its
 * name, so the nine lines no longer read as one list.
 */
function rowsOf(county: CountyAggregate) {
  // both readings, labelled: a comparison of two counties is exactly where
  // the choice between them must not be made for the reader
  const withD = vacancyOf(county, 'with');
  const withoutD = vacancyOf(county, 'without');
  const pct = (v: number | null) => (v !== null ? formatPercent(v) : '–');
  const reading = (v: typeof withD): Row[] => [
    [t('ranking.compareShort.vacant'), `${v.count} / ${county.total ?? '–'}`],
    [t('ranking.compareShort.rate'), pct(v.rate)],
    [t('ranking.compareShort.pop'), formatNumber(v.population)],
  ];
  const other: Row[] = [
    [t('ranking.comparePopShare'), county.populationShare != null ? formatPercent(county.populationShare) : '–'],
    [t('ranking.comparePer10k'), county.praxesPer10k != null ? formatDecimal(county.praxesPer10k.toFixed(2)) : '–'],
    [t('ranking.compareLongTerm'), county.longTerm != null ? String(county.longTerm) : '–'],
  ];
  return [['with', reading(withD)], ['without', reading(withoutD)], ['other', other]] as const;
}

function CountyCard({ county, color }: { county: CountyAggregate; color: string }) {
  return (
    <div className="compare-card">
      <h4><span className="compare-dot" style={{ background: color }} />{county.name}</h4>
      {rowsOf(county).map(([group, rows]) => (
        <div key={group} className="compare-card__group">
          <p className="compare-card__head">{t(`ranking.compareGroup.${group}`)}</p>
          <dl>
            {rows.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd style={{ color }}>{value}</dd></div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

export function CountyCompare() {
  const snapshot = useSnapshot()!;
  const kind = useAppStore((s) => s.kind);
  const mode = useContextStore((s2) => s2.dissolved);
  const history = useHistoryEntries();
  const counties = useMemo(
    () => [...snapshot.counties].sort((a, b) => a.name.localeCompare(b.name, 'hu')),
    [snapshot],
  );
  // defaults: the worst county vs Budapest (or the second-worst)
  const worst = useMemo(() => [...snapshot.counties].sort((a, b) => {
    const ra = a.total ? (a.vacant + a.dissolved) / a.total : 0;
    const rb = b.total ? (b.vacant + b.dissolved) / b.total : 0;
    return rb - ra;
  }), [snapshot]);
  const [nameA, setNameA] = useState(() => worst[0]?.name ?? '');
  const [nameB, setNameB] = useState(() => {
    const bp = snapshot.counties.find((c) => c.name === 'BUDAPEST');
    return bp?.name ?? worst[1]?.name ?? '';
  });
  const a = counties.find((c) => c.name === nameA);
  const b = counties.find((c) => c.name === nameB);

  const series = useMemo(() => {
    const pick = (name: string) => history.map((h) => {
      const c = h.byCounty[name];
      return c ? vacancyOf(c, mode).count : null;
    });
    return { a: pick(nameA), b: pick(nameB) };
  }, [history, nameA, nameB, mode]);

  const maxY = Math.max(1, ...series.a.filter((v): v is number => v !== null),
    ...series.b.filter((v): v is number => v !== null));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const xAt = (i: number) =>
    PAD.left + (history.length > 1 ? (i / (history.length - 1)) * innerW : 0);
  const yAt = (v: number) => PAD.top + innerH - (v / maxY) * innerH;
  const line = (values: (number | null)[]) => values
    .map((v, i) => (v === null ? null : `${i === 0 || values[i - 1] === null ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`))
    .filter(Boolean).join(' ');
  const years = useMemo(() => {
    const seen = new Set<string>();
    const all = history.map((h, i) => {
      const y = h.month.slice(0, 4);
      if (seen.has(y)) return null;
      seen.add(y);
      return { i, label: y };
    }).filter((v): v is { i: number; label: string } => v !== null);
    // thin the labels so they never collide on an irregular archive
    const step = Math.max(1, Math.ceil(all.length / 6));
    return all.filter((_, idx) => idx % step === 0);
  }, [history]);

  if (!a || !b) return null;
  return (
    <div className="compare">
      <h3 className="why__chain-title">{t('ranking.compareTitle')}</h3>
      <p className="section__explain">{t('ranking.compareExplain')}</p>
      <div className="compare__selects">
        <select value={nameA} onChange={(e) => setNameA(e.target.value)} aria-label="A">
          {counties.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <span className="compare__vs">vs</span>
        <select value={nameB} onChange={(e) => setNameB(e.target.value)} aria-label="B">
          {counties.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </div>
      <div className="compare__grid">
        <CountyCard county={a} color={COLOR_A} />
        <div className="compare-chart">
          <div className="compare-chart__head">
            <p>{t('ranking.compareChart', { kind: t(`kinds.${kind}.adj`) })}</p>
            <span className="compare-chart__legend">
              <span><i className="compare-dot" style={{ background: COLOR_A }} />{a.name}</span>
              <span><i className="compare-dot" style={{ background: COLOR_B }} />{b.name}</span>
            </span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('ranking.compareTitle')}>
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line x1={PAD.left} x2={W - PAD.right} y1={yAt(f * maxY)} y2={yAt(f * maxY)}
                  stroke="var(--line)" strokeWidth={1} />
                <text x={PAD.left - 6} y={yAt(f * maxY) + 4} textAnchor="end"
                  fill="var(--ink-faint)" fontSize="11">{Math.round(f * maxY)}</text>
              </g>
            ))}
            {years.map(({ i, label }) => (
              <text key={label} x={xAt(i)} y={H - 6} fill="var(--ink-faint)" fontSize="11">{label}</text>
            ))}
            <path d={line(series.a)} fill="none" stroke={COLOR_A} strokeWidth={2.4} />
            <path d={line(series.b)} fill="none" stroke={COLOR_B} strokeWidth={2.4} />
            {/* the latest value at each line's end */}
            {([['a', series.a, COLOR_A], ['b', series.b, COLOR_B]] as const).map(([k, vals, color]) => {
              const i = vals.map((v) => v !== null).lastIndexOf(true);
              if (i < 0) return null;
              return (
                <g key={k}>
                  <circle cx={xAt(i)} cy={yAt(vals[i] as number)} r={3.5} fill={color} />
                  <text x={xAt(i) + 7} y={yAt(vals[i] as number) + 4} fill={color} fontSize="12" fontWeight="700">{vals[i]}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <CountyCard county={b} color={COLOR_B} />
      </div>
    </div>
  );
}
