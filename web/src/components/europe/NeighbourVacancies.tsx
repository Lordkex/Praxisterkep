// europa.html#szomszedok: missing primary care next door. Slovakia counts the
// distance to a norm, which is not a vacancy: no Hungarian figure stands in
// the same table. The countries without a usable table are named, not filled.
import { useState } from 'react';
import { t } from '../../lib/i18n';
import { formatDecimal, formatNumber, formatPercent } from '../../lib/format';
import { useDataFile, type NeighboursRaw } from '../../lib/extraSources';

const KINDS = ['adult', 'child'] as const;
const NOT_INCLUDED = ['AT', 'SI', 'HR', 'RO', 'RS', 'UA'] as const;

export function NeighbourVacancies({ nameOf }: { nameOf: (geo: string) => string }) {
  const data = useDataFile<NeighboursRaw>('neighbours.json');
  const [kind, setKind] = useState<(typeof KINDS)[number]>('adult');
  const [border, setBorder] = useState(true);
  if (!data) return <section className="section container" id="szomszedok" />;
  const sk = data.slovakia;
  const k = sk.kinds[kind];
  const rows = k.rows.filter((r) => !border || sk.border.includes(r.kraj)).sort((a, b) => a.fill - b.fill);
  return (
    <section className="section container eu-section" id="szomszedok">
      <h2 className="section__heading">{t('neighbours.heading')}</h2>
      <p className="section__lead">{t('neighbours.lead')}</p>
      <p className="eu-note">{t('neighbours.notVacancy')}</p>
      <h3 className="eu-section__measure">{nameOf('SK')}<span>{sk.asOf}</span></h3>
      <div className="seg eu-chips" role="group" aria-label={t('neighbours.kindLabel')}>
        {KINDS.map((x) => (
          <button key={x} type="button" aria-pressed={kind === x} onClick={() => setKind(x)}>
            {t(`neighbours.kind.${x}`)}
          </button>
        ))}
      </div>
      <div className="outcome__kpis">
        <div><b>{formatNumber(k.missing)}</b><span>{t('neighbours.kpi.missing')}</span></div>
        <div><b>{formatNumber(k.short)} / {formatNumber(k.districts)}</b><span>{t('neighbours.kpi.short')}</span></div>
        <div><b>{formatNumber(k.borderMissing)}</b><span>{t('neighbours.kpi.border')}</span></div>
      </div>
      <label className="source-toggle">
        <input type="checkbox" checked={border} onChange={(e) => setBorder(e.target.checked)} />
        {t('neighbours.onlyBorder')}
      </label>
      <div className="table-wrap source-table">
        <table className="info-table outcome-table">
          <thead>
            <tr>
              <th>{t('neighbours.okres')}</th>
              <th>{t('neighbours.kraj')}</th>
              <th className="is-num">{t('neighbours.optimal')}</th>
              <th className="is-num">{t('neighbours.present')}</th>
              <th className="is-num">{t('neighbours.missing')}</th>
              <th className="is-num">{t('neighbours.fill')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.kraj}-${r.okres}`}>
                <td>{r.okres}</td>
                <td>{t(`neighbours.krajName.${r.kraj}`)}</td>
                <td className="is-num">{formatDecimal(r.optimal.toFixed(1))}</td>
                <td className="is-num">{formatDecimal(r.present.toFixed(1))}</td>
                <td className="is-num">{formatNumber(r.missing)}</td>
                <td className="is-num">{formatPercent(r.fill)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="section__source">
        {t('neighbours.source', { date: sk.fetched })}{' '}
        <a href={sk.url} target="_blank" rel="noopener noreferrer">{t('europe.source.open')}</a>
      </p>
      <h3 className="outcome__sub">{t('neighbours.othersHeading')}</h3>
      <dl className="source-status">
        {NOT_INCLUDED.map((g) => (
          <div key={g}><dt>{t(`neighbours.country.${g}`)}</dt><dd>{t(`neighbours.status.${g}`)}</dd></div>
        ))}
      </dl>
    </section>
  );
}
