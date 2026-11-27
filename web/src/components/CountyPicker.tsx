// Pick a county by clicking it.
//
// A dropdown of twenty names is a list of words; this is the question people
// actually have ("what about here?") in the shape they have it in. The
// outlines are the same GeoJSON the maps use, drawn once as plain SVG paths —
// no map library, no tiles, no interaction beyond the click.
import { useState } from 'react';
import { t } from '../lib/i18n';
import { useContextStore } from '../lib/context';
import { useCountyShapes } from '../lib/countyShapes';

const W = 720;
const H = 260;

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

export function CountyPicker({ onPick }: { onPick?: (county: string) => void }) {
  const county = useContextStore((s) => s.county);
  const setCounty = useContextStore((s) => s.setCounty);

  const shapes = useCountyShapes(W, H);
  const [hover, setHover] = useState<string | null>(null);

  // hold the map's place while the outlines load, so nothing under it jumps
  if (!shapes.length) return <div className="countypicker" aria-hidden="true"><div style={{ aspectRatio: `${W} / ${H}` }} /></div>;
  const pick = (name: string) => {
    setCounty(name === county ? null : name);
    onPick?.(name);
  };

  return (
    <div className="countypicker">
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={t('county.pick')}>
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
            long name ("JÁSZ-" vanished under Pest). Budapest is too small to
            carry its name inside itself. */}
        <g aria-hidden="true">
          {shapes.filter((s) => s.name !== 'Budapest').map((s) => (
            <g key={s.name} className={`countypicker__county countypicker__label${
              s.name === county ? ' is-on' : ''}${s.name === hover ? ' is-hover' : ''}`}>
              <text x={s.cx} y={s.cy} textAnchor="middle">
                {lines(s.name).map((part, i, all) => (
                  <tspan key={part} x={s.cx} dy={i === 0 ? `${-(all.length - 1) * 0.55}em` : '1.1em'}>{part}</tspan>
                ))}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}