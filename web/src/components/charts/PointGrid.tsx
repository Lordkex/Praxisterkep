// A count drawn as the places it counts.
//
// "10 on-call points" is a number; ten named towns, each one you can open, is
// the county. The points come in two groups — on-call surgeries and
// ambulance stations — each under its own heading with its count, and a town
// with more than one shows once, with "×2", rather than twice in a row (two
// "Pécs" chips side by side read as a mistake). Hovering a town says who runs
// what is there; clicking opens its page.
import { useState } from 'react';
import { t } from '../../lib/i18n';
import { formatNumber } from '../../lib/format';
import { IconAmbulance, IconOncall } from '../icons';
import type { EmergencyPoint } from '../../lib/counties';

const ICONS = { oncall: IconOncall, ambulance: IconAmbulance } as const;
const GROUPS = ['oncall', 'ambulance'] as const;

interface Place {
  key: string;
  group: EmergencyPoint['group'];
  settlement: string;
  slug: string;
  providers: string[];
}

/** the points of one group, one entry per town, towns A to Z */
function placesOf(points: readonly EmergencyPoint[], group: EmergencyPoint['group']): Place[] {
  const by = new Map<string, Place>();
  for (const p of points) {
    if (p.group !== group) continue;
    const key = p.settlement || `?${by.size}`;
    const cur = by.get(key) ?? { key, group, settlement: p.settlement, slug: p.slug, providers: [] };
    cur.providers.push(p.provider);
    by.set(key, cur);
  }
  return [...by.values()].sort((a, b) => (a.settlement || '￿').localeCompare(b.settlement || '￿', 'hu'));
}

export function PointGrid({ points, base }: {
  points: readonly EmergencyPoint[];
  /** where a settlement's own page lives */
  base: string;
}) {
  const [active, setActive] = useState<Place | null>(null);
  if (!points.length) return null;

  return (
    <div className="pointgrid" onPointerLeave={() => setActive(null)}>
      {GROUPS.map((group) => {
        const places = placesOf(points, group);
        if (!places.length) return null;
        const Icon = ICONS[group];
        const count = places.reduce((a, p) => a + p.providers.length, 0);
        return (
          <div key={group} className={`pointgrid__group pointgrid__group--${group}`}>
            <p className="pointgrid__head">
              <Icon />
              <span>{t(`county.pointGroup.${group}`)}</span>
              <b>{formatNumber(count)}</b>
            </p>
            <div className="pointgrid__dots">
              {places.map((p) => {
                const body = (
                  <>
                    <span className={`pointgrid__name${p.settlement ? '' : ' is-unknown'}`}>
                      {p.settlement || t('county.pointUnknownShort')}
                    </span>
                    {p.providers.length > 1 && <span className="pointgrid__times">×{p.providers.length}</span>}
                  </>
                );
                const className = `pointgrid__dot pointgrid__dot--${group}${active === p ? ' is-on' : ''}`;
                const hover = { onPointerEnter: () => setActive(p), onFocus: () => setActive(p) };
                return p.slug ? (
                  <a key={p.key} className={className} href={`${base}telepules/${p.slug}/`} {...hover}>
                    {body}
                  </a>
                ) : (
                  <span key={p.key} className={className} tabIndex={0} {...hover}>{body}</span>
                );
              })}
            </div>
          </div>
        );
      })}
      {/* the line under the chips answers the pointer: who runs what is there */}
      <p className="pointgrid__caption" aria-live="polite">
        {active
          ? <>
            <strong>{active.settlement || t('county.pointUnknown')}</strong>
            {' · '}{active.providers.length > 1
              ? t('county.pointMany', { n: active.providers.length, what: t(`county.point.${active.group}`) })
              : t(`county.point.${active.group}`)}
            {active.providers.filter(Boolean).length > 0 && (
              <span className="pointgrid__provider">{' · '}{[...new Set(active.providers.filter(Boolean))].join('; ')}</span>
            )}
          </>
          : t('county.pointHint')}
      </p>
    </div>
  );
}
