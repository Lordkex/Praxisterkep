// Where one járás stands among all of them, without 197 bars on the screen.
//
// A full ranking of 197 rows is unreadable and mostly irrelevant: what a
// reader wants is the worst few, the best few, and their own somewhere in
// between — with the national median drawn through all of it, so "middling"
// means something. It ranks by whichever measure the page's comparison
// section has picked, worst end first: the same measure the distribution shows.
import { t } from '../../lib/i18n';
import { rankOf, type DistrictsRaw, type Measure } from '../../lib/districts';

const ROW = 20;
const LABEL = 190;
const VALUE = 96;
const W = 860;
const EDGE = 8;

export function DistrictRanking({ data, measure, format, selected, onPick }: {
  data: DistrictsRaw | null;
  measure: Measure;
  format: (value: number) => string;
  selected: string;
  onPick?: (name: string) => void;
}) {
  const all = (data?.districts ?? [])
    .map((d) => ({ name: d.name, county: d.county, v: measure.value(d) }))
    .filter((r): r is { name: string; county: string; v: number } => r.v !== null)
    // the worst end first, whichever way the measure is bad
    .sort((a, b) => (measure.worseHigh ? b.v - a.v : a.v - b.v));
  if (all.length < 4) return null;
  const stats = rankOf(data, selected, measure.value);

  const top = all.slice(0, EDGE);
  const bottom = all.slice(-EDGE);
  const here = all.findIndex((r) => r.name === selected);
  const shown: (typeof all[number] | null)[] = [...top];
  if (here >= EDGE && here < all.length - EDGE) {
    shown.push(null, all[here]);
  }
  shown.push(null, ...bottom);

  const max = Math.max(...all.map((r) => r.v)) || 1;
  const height = shown.length * ROW + 26;
  const x = (v: number) => (v / max) * (W - LABEL - VALUE);
  const median = stats?.median ?? 0;

  return (
    <div className="ranking-chart district-ranking">
      <svg viewBox={`0 0 ${W} ${height}`} role="img"
        aria-label={t('district.rankingHeading')}>
        {shown.map((r, i) => {
          const y = i * ROW + 8;
          if (!r) {
            return (
              <text key={`gap${i}`} x={LABEL - 10} y={y + ROW / 2 + 4} textAnchor="end"
                className="district-ranking__gap">⋮</text>
            );
          }
          const on = r.name === selected;
          return (
            <g key={r.name} className={`district-ranking__row${on ? ' is-on' : ''}`}
              onClick={onPick ? () => onPick(r.name) : undefined}>
              <title>{`${r.name} (${r.county}): ${format(r.v)}`}</title>
              <text x={LABEL - 10} y={y + ROW / 2 + 4} textAnchor="end"
                className="district-ranking__label">{r.name}</text>
              <rect x={LABEL} y={y + 2} width={Math.max(2, x(r.v))} height={ROW - 6}
                rx={2} fill={on ? 'var(--accent)' : 'var(--bad)'}
                fillOpacity={on ? 1 : 0.75} />
              <text x={LABEL + x(r.v) + 8} y={y + ROW / 2 + 4}
                className="district-ranking__value">{format(r.v)}</text>
            </g>
          );
        })}
        {median > 0 && (
          <g>
            <line x1={LABEL + x(median)} x2={LABEL + x(median)} y1={4}
              y2={shown.length * ROW + 6} className="district-ranking__median" />
            <text x={LABEL + x(median) + 4} y={shown.length * ROW + 20}
              className="district-ranking__value">
              {t('district.medianLine', { n: format(median) })}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
