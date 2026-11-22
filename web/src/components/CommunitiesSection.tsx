// Elemző › Járások és megyék › #praxiskozossegek: OKFŐ's territorial division
// of the collegial praxis communities, with the vacancy of the járás in each.
// A division, not a membership list — the text says so beside the numbers.
import { useState } from 'react';
import { t } from '../lib/i18n';
import { formatMonth, formatNumber, formatPercent } from '../lib/format';
import { districtHref } from '../lib/outcomes';
import { byHighest, useDataFile, type CommunitiesRaw } from '../lib/extraSources';

const KINDS = ['gp', 'dental'] as const;

export function CommunitiesSection() {
  const data = useDataFile<CommunitiesRaw>('communities.json');
  const [kind, setKind] = useState<(typeof KINDS)[number]>('gp');
  const [county, setCounty] = useState('');
  if (!data) return <section className="section container" id="praxiskozossegek" />;
  const all = data.communities;
  const counties = [...new Set(all.map((c) => c.county))].sort((a, b) => a.localeCompare(b, 'hu'));
  const rows = byHighest(all.filter((c) => !county || c.county === county), (c) => c[kind].rate);
  return (
    <section className="section container outcome" id="praxiskozossegek">
      <h2 className="section__heading">{t('communities.heading')}</h2>
      <p className="section__lead">{t('communities.lead')}</p>
      <p className="eu-note">{t('communities.notMembership')}</p>
      <div className="outcome__kpis">
        <div><b>{formatNumber(data.stats.communities)}</b><span>{t('communities.kpi.all')}</span></div>
        <div><b>{formatNumber(data.stats.single)}</b><span>{t('communities.kpi.single')}</span></div>
        <div>
          <b>{formatNumber(all.filter((c) => (c[kind].rate ?? 0) >= 0.25).length)}</b>
          <span>{t(`communities.kpi.quarter.${kind}`)}</span>
        </div>
      </div>
      <div className="source-controls">
        <div className="seg" role="group" aria-label={t('communities.kindLabel')}>
          {KINDS.map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {t(`communities.kind.${k}`)}
            </button>
          ))}
        </div>
        <label className="eu-select eu-select--inline">
          <span>{t('communities.county')}</span>
          <select value={county} onChange={(e) => setCounty(e.target.value)}>
            <option value="">{t('communities.allCounties')}</option>
            {counties.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <div className="table-wrap source-table">
        <table className="info-table outcome-table">
          <thead>
            <tr>
              <th>{t('communities.members')}</th>
              <th>{t('communities.county')}</th>
              <th className="is-num">{t('communities.total')}</th>
              <th className="is-num">{t(`communities.vacant.${kind}`)}</th>
              <th className="is-num">{t('communities.longTerm')}</th>
              <th className="is-num">{t('communities.rate')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.members.map((m, i) => (
                    <span key={m.code}>{i > 0 && ', '}<a href={districtHref(m.name)}>{m.name}</a></span>
                  ))}
                </td>
                <td>{c.county}</td>
                <td className="is-num">{formatNumber(c[kind].total)}</td>
                <td className="is-num">{formatNumber(c[kind].vacant + c[kind].dissolved)}</td>
                <td className="is-num">{formatNumber(c[kind].longTerm)}</td>
                <td className="is-num">{c[kind].rate === null ? '–' : formatPercent(c[kind].rate as number)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="section__source">
        {t('communities.source', { date: data.fetched, month: formatMonth(data.dataMonth) })}{' '}
        <a href={data.url} target="_blank" rel="noopener noreferrer">{t('europe.source.open')}</a>
      </p>
    </section>
  );
}
