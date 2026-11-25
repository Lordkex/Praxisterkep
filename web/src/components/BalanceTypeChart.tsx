// The district stock by type as stacked bars, in the manner of a nivo
// horizontal stacked bar chart: one bar per type, its length the number of
// districts (one shared scale, so the big adult stock and the smaller
// paediatric one read at their true sizes), split into filled and vacant, and
// each segment carrying its own count. A segment too narrow for its number
// writes it just after itself (on a phone, on a line under the bar, with a
// colour key), so no count is ever missing. The vacancy rate closes the row.
// No hover layer: every number is already on the chart.
//
// In GP care NEAK also lists practices without a territorial obligation (TEK
// nélküli praxis). They are practices, not districts: no assigned area, so
// never vacant. They get their own colour and sit apart from the district
// bar, after a wider gap, and the legend says "not a district", so the two
// units cannot be read as one.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n';
import { formatNumber, formatPercent } from '../lib/format';
import type { TypeRow } from '../lib/balance';

export interface ChartRow extends TypeRow { label: string; tn: number | null }

type SegKey = 'filled' | 'vacant' | 'dissolved' | 'tn';
const TOKENS: Record<SegKey, string> = {
  filled: '--good', vacant: '--bad', dissolved: '--s8', tn: '--violet',
};

/** a round step for 3–5 gridlines across the scale */
function niceStep(max: number): number {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
}

/** dark or light ink for a label on a fill, by the fill's luminance */
function inkOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const lin = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  const l = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return l > 0.3 ? '#0b1220' : '#ffffff';
}

/** the label ink for each fill, re-read when the theme or the palette changes */
function useInks(): Record<SegKey, string> {
  const read = () => {
    const cs = getComputedStyle(document.documentElement);
    return Object.fromEntries(Object.entries(TOKENS).map(([k, v]) =>
      [k, inkOn(cs.getPropertyValue(v))])) as Record<SegKey, string>;
  };
  const [inks, setInks] = useState(read);
  useEffect(() => {
    const mo = new MutationObserver(() => setInks(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-palette', 'style', 'class'] });
    return () => mo.disconnect();
  }, []);
  return inks;
}

/** the counts fit inside a segment when it is wider than the number */
const fits = (px: number, n: number) => px >= formatNumber(n).length * 7.6 + 14;

/** the width of an element, kept current */
function useWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export interface LegendItem { key: SegKey; label: string }

/** the colour keys, shown once for the total bar and the bars by type */
export function BalanceLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="tchart__legend">
      {items.map((i) => (
        <li key={i.key}><i className={`tchart__key tchart__key--${i.key}`} />{i.label}</li>
      ))}
    </ul>
  );
}

/**
 * The whole stock as one bar in the same manner as the bars by type: filled,
 * vacant and (dental) dissolved, each segment carrying its count, the
 * headline rate at the end of the row.
 */
export function BalanceTotalBar({ parts, rate, rateLabel }: {
  parts: { key: 'filled' | 'vacant' | 'dissolved'; n: number }[];
  rate: string; rateLabel: string;
}) {
  const [track, width] = useWidth();
  const inks = useInks();
  const shown = parts.filter((p) => p.n > 0);
  const total = shown.reduce((a, p) => a + p.n, 0);
  if (!total) return null;
  const outW = (n: number) => 6 + formatNumber(n).length * 7.6;
  const room = (reserve: number) => Math.max(0, width - reserve) / total;
  const outside = (k: number) => shown.filter((p) => !fits(p.n * k, p.n));
  const k1 = room(0);
  const k = room(outside(k1).reduce((a, p) => a + 6 + outW(p.n), 0));
  const out = width > 0 ? outside(k) : [];
  return (
    <div className="tchart tchart--total">
      <div className="tchart__row tchart__row--total">
        <div className="tchart__track" ref={track}>
          <div className="tchart__bar" style={{ width: `${total * k}px` }}>
            {shown.map((p) => (
              <span key={p.key} className={`tchart__seg tchart__seg--${p.key}`}
                style={{ flexGrow: p.n, color: inks[p.key] }}>
                {width > 0 && fits(p.n * k, p.n) && formatNumber(p.n)}
              </span>
            ))}
          </div>
          {out.map((p) => <span key={p.key} className="tchart__out">{formatNumber(p.n)}</span>)}
        </div>
        <div className="tchart__value tchart__value--total">
          <b>{rate}</b>
          <small>{rateLabel}</small>
        </div>
      </div>
    </div>
  );
}

export function BalanceTypeChart({ rows, showTn, legend = true }: {
  rows: ChartRow[]; showTn: boolean;
  /** false when the legend is already shown above, with the total bar */
  legend?: boolean;
}) {
  const track = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const inks = useInks();

  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  if (!rows.length) return null;

  const max = Math.max(...rows.map((r) => r.total + (showTn ? r.tn ?? 0 : 0)));
  const step = niceStep(max);
  const ticks: number[] = [];
  for (let v = 0; v <= max; v += step) ticks.push(v);
  // the bar's room: the track less the gaps and the counts written after the
  // segments. Which counts go outside depends on the room: settle it in two passes.
  const outW = (n: number) => 6 + formatNumber(n).length * 7.6;
  const scale = (reserve: number) => Math.max(0, width - reserve) / max;
  const reserveFor = (k: number) => Math.max(12, ...rows.map((r) => {
    const tn = showTn ? r.tn ?? 0 : 0;
    const out = [r.filled, r.vacant, tn].filter((n) => n > 0 && !fits(n * k, n));
    return (tn > 0 ? 6 : 0) + out.reduce((a, n) => a + 6 + outW(n), 0) + 4;
  }));
  // on a narrow screen the outside counts drop to a line of their own under
  // the bar, so the bars keep the whole track
  const stacked = width > 0 && width < 380;
  const k = stacked ? scale(16) : scale(reserveFor(scale(reserveFor(scale(70)))));
  const px = (n: number) => n * k;
  const inside = (n: number) => width > 0 && fits(px(n), n);
  // tick labels at least ~44px apart
  const shown = ticks.filter((_, j) => j % Math.max(1, Math.ceil(44 / Math.max(1, px(step)))) === 0);

  return (
    <div className="tchart">
      {legend && (
        <BalanceLegend items={[
          { key: 'filled', label: t('balance.legendFilled') },
          { key: 'vacant', label: t('balance.legendVacant') },
          ...(showTn ? [{ key: 'tn' as const, label: t('balance.legendTn') }] : []),
        ]} />
      )}

      <div className="tchart__rows" role="img" aria-label={`${t('balance.chartAria')}. ${rows.map((r) =>
        `${r.label}: ${t('balance.rowCount', { vacant: formatNumber(r.vacant), total: formatNumber(r.total) })}, ${formatPercent(r.rate)}`
        + (showTn && r.tn ? `, ${t('balance.rowTn', { n: formatNumber(r.tn) })}` : '')).join('; ')}`}>
        {rows.map((r, i) => {
          const tn = showTn ? r.tn ?? 0 : 0;
          const segs: { key: SegKey; n: number }[] = [
            { key: 'filled', n: r.filled }, { key: 'vacant', n: r.vacant },
          ].filter((s) => s.n > 0) as { key: SegKey; n: number }[];
          const all = tn > 0 ? [...segs, { key: 'tn' as const, n: tn }] : segs;
          const outside = all.filter((s) => width > 0 && !inside(s.n));
          // beside its own colour the number needs no key; under the bar it does
          const after = (keys: SegKey[]) => !stacked && outside.filter((s) => keys.includes(s.key))
            .map((s) => <span key={s.key} className="tchart__out">{formatNumber(s.n)}</span>);
          return (
            <div className="tchart__row" key={r.key}>
              <div className="tchart__label">{r.label}</div>
              <div className="tchart__track" ref={i === 0 ? track : undefined}>
                {shown.map((v) => <span key={v} className="tchart__grid" style={{ left: `${px(v)}px` }} />)}
                <div className="tchart__bar" style={{ width: `${px(r.total)}px` }}>
                  {segs.map((s) => (
                    <span key={s.key} className={`tchart__seg tchart__seg--${s.key}`}
                      style={{ flexGrow: s.n, color: inks[s.key] }}>
                      {inside(s.n) && formatNumber(s.n)}
                    </span>
                  ))}
                </div>
                {after(['filled', 'vacant'])}
                {tn > 0 && (
                  <span className="tchart__seg tchart__seg--tn" style={{ width: `${px(tn)}px`, color: inks.tn }}>
                    {inside(tn) && formatNumber(tn)}
                  </span>
                )}
                {after(['tn'])}
              </div>
              {stacked && outside.length > 0 && (
                <div className="tchart__chips">
                  {outside.map((s) => (
                    <span key={s.key} className="tchart__out">
                      <i className={`tchart__key tchart__key--${s.key}`} />{formatNumber(s.n)}
                    </span>
                  ))}
                </div>
              )}
              <div className="tchart__value">
                <b>{formatPercent(r.rate)}</b>
                <small>{t('balance.rateShort')}</small>
              </div>
            </div>
          );
        })}
        <div className="tchart__row tchart__row--axis" aria-hidden="true">
          <div className="tchart__label" />
          <div className="tchart__track">
            {shown.map((v) => (
              <span key={v} className="tchart__tick" style={{ left: `${px(v)}px` }}>{formatNumber(v)}</span>
            ))}
          </div>
          <div className="tchart__value"><small>{t('balance.axisUnit')}</small></div>
        </div>
      </div>
    </div>
  );
}
