import type { ReactNode } from 'react';

/**
 * The figure and the words beside a ring. Every text it can show sits in one
 * grid cell, the hidden ones invisible but still taking their room, so the
 * cell is as tall as the longest: hovering a slice changes the words and
 * moves nothing. "betöltetlen vagy megszűnt …" took a line more than
 * "betöltetlen …", and the legend under it jumped on every hover.
 */
export function Headline({ on, variants }: {
  on: string;
  variants: readonly { key: string; value: ReactNode; label: string }[];
}) {
  return (
    <div className="county-card__headline">
      {variants.map((v) => (
        <div key={v.key} aria-hidden={v.key === on ? undefined : true}
          className={`county-card__variant${v.key === on ? '' : ' is-off'}`}>
          <div className="stat__value">{v.value}</div>
          <div className="stat__label">{v.label}</div>
        </div>
      ))}
    </div>
  );
}
