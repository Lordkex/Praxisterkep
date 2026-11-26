// Pick a county by clicking it.
//
// A dropdown of twenty names is a list of words; this is the question people
// actually have ("what about here?") in the shape they have it in. The
// outlines are the same GeoJSON the maps use, drawn once as plain SVG paths —
// no map library, no tiles, no interaction beyond the click.
import { useState, type ReactNode } from 'react';
import { t } from '../lib/i18n';
import { useContextStore } from '../lib/context';
import { useCountyShapes } from '../lib/countyShapes';

const W = 720;
const H = 260;
// how far the map moves left when a dropdown takes the top-right corner; the
// fitted country leaves about 150 units free on either side of the box
const SHIFT = 110;

/** `side` sits in the map's top-right corner (under it on a phone): the
 *  dropdown for the keyboard, which used to stand under the map as a
 *  second picker. */
/** A name longer than 12 letters, split at the hyphen nearest its middle:
 *  "Győr-Moson-" over "Sopron", "Komárom-" over "Esztergom". On one line the
 *  two crossed each other, and the longest ran over the map's edge. */
function lines(name: string): string[] {
  if (name.length <= 12) return [name];
  const cuts = [...name].map((c, i) => (c === '-' ? i : -1)).filter((i) => i > 0);
  if (!cuts.length) return [name];
  const mid = name.length / 2;
  const at = cuts.reduce((best, i) => (Math.abs(i - mid) < Math.abs(best - mid) ? i : best));
  return [name.slice(0, at + 1), name.slice(at + 1)];
}

export function CountyPicker({ onPick, side }: { onPick?: (county: string) => void; side?: ReactNode }) {
  const county = useContextStore((s) => s.county);
  const setCounty = useContextStore((s) => s.setCounty);

  const shapes = useCountyShapes(W, H);
  const [hover, setHover] = useState<string | null>(null);

  // hold the map's place while the outlines load, so nothing under it jumps
  if (!shapes.length) {
    return (
      <div className="countypicker">
        <div aria-hidden="true" style={{ aspectRatio: `${W} / ${H}` }} />
        {side && <div className="countypicker__side">{side}</div>}
      </div>
    );
  }
  const pick = (name: string) => {
    setCounty(name === county ? null : name);
    onPick?.(name);
  };

  return (
    <div className="countypicker">
      {/* with the dropdown in the corner the country moves a little to the
          left (the box is wider than the map), so the two never meet */}
      <svg viewBox={`${side ? SHIFT : 0} 0 ${W} ${H}`} role="group" aria-label={t('county.pick')}>
        {/* the chosen county, and the one under the pointer, go last: SVG
            paints in document order, so an outline drawn in place vanishes
            under whichever neighbours come after it */}
        {[...shapes]
          .sort((a, b) => (Number(a.name === hover) - Number(b.name === hover))
            || (Number(a.name === county) - Number(b.name === county)))
          .map((s) => (
          <g key={s.name} className={`countypicker__county${
            s.name === county ? ' is-on' : ''}${s.name === hover ? ' is-hover' : ''}`}
            onClick={() => pick(s.name)} role="button" tabIndex={0}
            onPointerEnter={() => setHover(s.name)}
            onPointerLeave={() => setHover((cur) => (cur === s.name ? null : cur))}
            onFocus={() => setHover(s.name)}
            onBlur={() => setHover((cur) => (cur === s.name ? null : cur))}
            aria-pressed={s.name === county}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') pick(s.name); }}>
            <title>{s.name}</title>
            <path d={s.d} />
          </g>
          ))}
        {/* the names in a layer of their own, over every outline: drawn with
            their county, a neighbour painted later covered the start of a
            long name ("JÁSZ-" vanished under Pest) */}
        <g aria-hidden="true">
          {shapes.filter((s) => s.name !== 'Budapest').map((s) => (
            <g key={s.name} className={`countypicker__county countypicker__label${
              s.name === county ? ' is-on' : ''}${s.name === hover ? ' is-hover' : ''}`}>
              <text x={s.cx} y={s.cy} textAnchor="middle">
                {/* a long name on two lines, so neighbours never overlap */}
                {lines(s.name).map((part, i, all) => (
                  <tspan key={part} x={s.cx} dy={i === 0 ? `${-(all.length - 1) * 0.55}em` : '1.1em'}>{part}</tspan>
                ))}
              </text>
            </g>
          ))}
        </g>
      </svg>
      {side && <div className="countypicker__side">{side}</div>}
    </div>
  );
}
