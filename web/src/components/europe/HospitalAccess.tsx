// europa.html#korhaz-eleres: driving time to hospital by Eurostat GISCO — the
// countries, the pairs across our border, and the same thing held against
// our own driving times. No places are numbered: what counts as a hospital
// is each country's own definition.
import { useState } from 'react';
import { t } from '../../lib/i18n';
import { formatDecimal, formatPercent } from '../../lib/format';
import { useDataFile, type HospitalRaw } from '../../lib/extraSources';
import type { EuView } from './IndicatorSection';

const MEASURES = ['median', 'over20', 'over45'] as const;

export function HospitalAccess({ view }: { view: EuView }) {
  const data = useDataFile<HospitalRaw>('hospital_access.json');
  const [key, setKey] = useState<(typeof MEASURES)[number]>('median');
  if (!data) return <section className="section container" id="korhaz-eleres" />;
  const min = (v: number) => t('hospital.minutes', { n: formatDecimal(v.toFixed(1)) });
  const fmt = (v: number) => (key === 'median' ? min(v) : formatPercent(v / 100));
  const shown = Object.entries(data.countries).filter(([g]) => view.members.includes(g))
    .sort((a, b) => a[1][key] - b[1][key]);
  const hi = Math.max(0.01, ...shown.map(([, v]) => v[key]));
  const missing = view.members.filter((g) => !data.countries[g]);
  const region = (g: string) => data.regions[g];
  return (
    <section className="section container eu-section" id="korhaz-eleres">
      <h2 className="section__heading">{t('hospital.heading')}</h2>
      <p className="section__lead">{t('hospital.lead', { year: data.year })}</p>
      <div className="seg eu-chips" role="group" aria-label={t('europe.pickMeasure')}>
        {MEASURES.map((k) => (
          <button key={k} type="button" aria-pressed={key === k} onClick={() => setKey(k)}>
            {t(`hospital.measure.${k}`)}
          </button>
        ))}
      </div>
      <ul className="source-bars">
        {shown.map(([g, v]) => (
          <li key={g} className={g === 'HU' ? 'is-on' : ''}>
            <span>{view.nameOf(g)}</span>
            <span className="source-bars__track"><i style={{ width: `${(v[key] / hi) * 100}%` }} /></span>
            <b>{fmt(v[key])}</b>
          </li>
        ))}
      </ul>
      {missing.length > 0 && (
        <p className="outcome__hint">{t('europe.missing', { list: missing.map(view.nameOf).join(', ') })}</p>
      )}
      <p className="eu-note">{t('hospital.definition')}</p>

      <h3 className="outcome__sub">{t('hospital.pairsHeading')}</h3>
      <div className="table-wrap source-table">
        <table className="info-table outcome-table">
          <thead>
            <tr>
              <th>{t('hospital.megye')}</th>
              <th className="is-num">{t(`hospital.measure.${key}`)}</th>
              <th>{t('hospital.across')}</th>
              <th className="is-num">{t(`hospital.measure.${key}`)}</th>
            </tr>
          </thead>
          <tbody>
            {data.pairs.map(([a, b]) => (
              <tr key={`${a}-${b}`}>
                <td>{region(a).name}</td>
                <td className="is-num">{fmt(region(a)[key])}</td>
                <td>{region(b).name}<small>{view.nameOf(b.slice(0, 2))}</small></td>
                <td className="is-num">{fmt(region(b)[key])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="outcome__hint">{t('hospital.pairsNote')}</p>

      <details className="source-check">
        <summary>{t('hospital.checkHeading')}</summary>
        <p className="section__explain">{t('hospital.checkText', {
          gisco: formatDecimal(data.countries.HU.median.toFixed(1)),
          own: formatDecimal(data.ownNational.median.toFixed(1)),
        })}</p>
        <div className="table-wrap">
          <table className="info-table outcome-table">
            <thead>
              <tr>
                <th>{t('hospital.megye')}</th>
                <th className="is-num">{t('hospital.gisco')}</th>
                <th className="is-num">{t('hospital.own')}</th>
              </tr>
            </thead>
            <tbody>
              {data.check.map((r) => (
                <tr key={r.geo}>
                  <td>{region(r.geo).name}</td>
                  <td className="is-num">{min(r.gisco)}</td>
                  <td className="is-num">{min(r.own)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="section__source">
        {t('hospital.source', { version: data.version, date: data.fetched })}{' '}
        <a href={data.url} target="_blank" rel="noopener noreferrer">{t('europe.source.open')}</a>
      </p>
    </section>
  );
}
