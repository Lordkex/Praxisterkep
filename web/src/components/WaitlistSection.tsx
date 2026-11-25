// "Mennyit kell várni?" (szakellato.html#varolistak): NEAK's surgical waiting
// lists. The national row is the country; the institutions under it are only
// those that keep a list, so they are never summed or averaged into one.
import { useState } from 'react';
import { t } from '../lib/i18n';
import { formatNumber } from '../lib/format';
import { byHighest, useDataFile, type WaitlistRaw } from '../lib/extraSources';

const GROUPS = ['mandatory', 'capacity'] as const;

export function WaitlistSection() {
  const data = useDataFile<WaitlistRaw>('waitlist.json');
  const [code, setCode] = useState('O20');
  if (!data) return <section className="section container" id="varolistak" />;
  const p = data.procedures.find((x) => x.code === code) ?? data.procedures[0];
  const days = (v: number | null) => (v === null ? '–' : t('waitlist.days', { n: formatNumber(v) }));
  const label = (c: string, name: string) => {
    const key = `waitlist.proc.${c}`;
    const own = t(key);
    return own === key ? name : own;
  };
  return (
    <section className="section container" id="varolistak">
      <h2 className="section__heading">{t('waitlist.heading')}</h2>
      <p className="section__lead">{t('waitlist.lead')}</p>
      <label className="eu-select source-select">
        <span>{t('waitlist.pick')}</span>
        <select value={p.code} onChange={(e) => setCode(e.target.value)}>
          {GROUPS.map((g) => (
            <optgroup key={g} label={t(`waitlist.group.${g}`)}>
              {data.procedures.filter((x) => x.group === g).map((x) => (
                <option key={x.code} value={x.code}>{label(x.code, x.name)}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {p.national ? (
        <>
          <h3 className="outcome__sub">{t('waitlist.national')}</h3>
          <div className="outcome__kpis">
            <div><b>{days(p.national.median)}</b><span>{t('waitlist.median')}</span></div>
            <div><b>{days(p.national.mean)}</b><span>{t('waitlist.mean')}</span></div>
            <div><b>{formatNumber(p.national.over60)}</b><span>{t('waitlist.over60')}</span></div>
            <div><b>{formatNumber(p.national.served)}</b><span>{t('waitlist.served')}</span></div>
          </div>
        </>
      ) : <p className="eu-note">{t('waitlist.noNational')}</p>}
      {p.institutions.length > 0 && (
        <>
          <h3 className="outcome__sub">{t('waitlist.institutions', { n: p.institutions.length })}</h3>
          <p className="section__explain">{t('waitlist.subset')}</p>
          <div className="table-wrap source-table">
            <table className="info-table outcome-table">
              <thead>
                <tr>
                  <th>{t('waitlist.institution')}</th>
                  <th>{t('waitlist.region')}</th>
                  <th className="is-num">{t('waitlist.median')}</th>
                  <th className="is-num">{t('waitlist.mean')}</th>
                  <th className="is-num">{t('waitlist.over60')}</th>
                  <th className="is-num">{t('waitlist.served')}</th>
                </tr>
              </thead>
              <tbody>
                {byHighest(p.institutions, (r) => r.median).map((r) => (
                  <tr key={`${r.name}|${r.list}`}>
                    <td>{r.name}{r.list.includes(' - ') && <small>{r.list.slice(r.list.indexOf(' - ') + 3)}</small>}</td>
                    <td>{r.region}</td>
                    <td className="is-num">{days(r.median)}</td>
                    <td className="is-num">{days(r.mean)}</td>
                    <td className="is-num">{formatNumber(r.over60)}</td>
                    <td className="is-num">{formatNumber(r.served)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="outcome__hint">{t('waitlist.note')}</p>
      <p className="section__source">
        {t('waitlist.source', { date: data.fetched })}{' '}
        <a href={data.url} target="_blank" rel="noopener noreferrer">{t('europe.source.open')}</a>
      </p>
    </section>
  );
}
