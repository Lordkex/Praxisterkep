// The scroll story's trend step: the vacant districts month by month since the
// first archived NEAK list, as one line that draws itself when the step comes
// into view (CSS, so reduced motion shows it finished). The scale starts at
// zero, and a month missing from the archive is bridged by a straight segment.
// The first and the last month are labelled with their counts; nothing else
// competes with the line.
import { extent, scaleLinear, scaleTime } from 'd3';
import { formatNumber } from '../lib/format';
import { monthToDate, type SeriesPoint } from '../lib/statsSelectors';

const W = 520;
const H = 300;
const PAD = { l: 20, r: 64, t: 34, b: 34 };

export function IntroTrend({ points, color }: { points: SeriesPoint[]; color: string }) {
  if (points.length < 2) return null;
  const dates = points.map((p) => monthToDate(p.month));
  const [d0, d1] = extent(dates) as [Date, Date];
  const x = scaleTime().domain([d0, d1]).range([PAD.l, W - PAD.r]);
  const values = points.map((p) => p.value);
  // from zero, so a change of 18 districts does not look like a collapse
  const hi = Math.max(...values);
  const y = scaleLinear().domain([0, hi * 1.08]).range([H - PAD.b, PAD.t]);
  const xy = (p: SeriesPoint) => [x(monthToDate(p.month)), y(p.value)] as const;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${xy(p).join(',')}`).join('');
  const first = points[0];
  const last = points[points.length - 1];
  const [fx, fy] = xy(first);
  const [lx, ly] = xy(last);
  const base = H - PAD.b;
  const area = `${line} L${lx},${base} L${fx},${base} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="intro__shape intro-trend" aria-hidden="true">
      <line x1={PAD.l} x2={W - PAD.r} y1={base} y2={base} className="intro-trend__base" />
      <path d={area} fill={color} className="intro-trend__area" />
      <path d={line} stroke={color} pathLength={1} className="intro-trend__line" />
      <circle cx={fx} cy={fy} r={4} fill={color} className="intro-trend__dot" />
      <text x={fx} y={fy - 12} className="intro-trend__value" textAnchor="start">
        {formatNumber(first.value)}
      </text>
      <circle cx={lx} cy={ly} r={6} fill={color} className="intro-trend__dot intro-trend__dot--last" />
      <text x={lx} y={ly - 14} className="intro-trend__value intro-trend__value--last" textAnchor="middle">
        {formatNumber(last.value)}
      </text>
      <text x={PAD.l} y={H - 8} className="intro-trend__year">{d0.getFullYear()}</text>
      <text x={lx} y={H - 8} className="intro-trend__year" textAnchor="middle">{d1.getFullYear()}</text>
    </svg>
  );
}
