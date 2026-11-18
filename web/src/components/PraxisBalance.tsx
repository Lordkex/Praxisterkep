// What the headline number is a part of.
//
// The landing used to open with "1026" — the vacant GP districts — and left
// the reader to wonder of how many. This block puts the whole stock first:
// how many districts the branch has, how many of them have a contracted
// physician, how many do not, and (for dental, where NEAK publishes such a
// list) how many were dissolved outright.
//
// Then it splits the stock by type, because one number hides two different
// countries: an adult district without a doctor and a paediatric one without
// a doctor are not the same problem, and in GP care they fail at very
// different rates. "Vegyes" is listed with them rather than folded away — in
// most villages it is the only district there is, serving adults and children
// together.
//
// In GP care it also answers the question the site was asked most after the
// press coverage: why 6281 here and 6357 elsewhere? The districts carry a
// territorial obligation; beside them NEAK lists practices without one (TN),
// never vacant and never on the map. The chart draws them apart from the
// district bars (a practice is not a district), the table lists both side by
// side, and a card links to the page about the second group (tek-nelkul.html).
import { useState } from 'react';
import { t, tKind } from '../lib/i18n';
import { formatMonth, formatNumber, formatPercent } from '../lib/format';
import { useAppStore, useSnapshot } from '../store/useAppStore';
import { stockOf, typeRows } from '../lib/balance';
import { useContextStore } from '../lib/context';
import { vacancyOf } from '../lib/vacancy';
import { DissolvedSwitch } from './DissolvedSwitch';
import { useNonTerritorial } from '../lib/nonterritorial';
import type { PraxisKind } from '../types';
import { BalanceLegend, BalanceTotalBar, BalanceTypeChart } from './BalanceTypeChart';
import { SegmentedControl } from './SegmentedControl';
import { IconStethoscope } from './icons';

export function PraxisBalance() {
  const snapshot = useSnapshot();
  const kind = useAppStore((s) => s.kind) as PraxisKind;
  const mode = useContextStore((s) => s.dissolved);
  const tekData = useNonTerritorial();
  // the split by type reads first as a chart; the table holds the exact counts
  const [view, setView] = useState<'chart' | 'table'>('chart');
  if (!snapshot) return null;

  const stock = stockOf(snapshot);
  if (!stock) return null;
  const { total, vacant, dissolved, filled } = stock;

  // the same code means a different thing in the two branches: "gyermek" is
  // a házi gyermekorvosi körzet in GP care and gyermekfogászat in dental, and
  // the table should say which
  const rows = typeRows(snapshot, mode).map((row) => {
    const named = t(`balance.type.${kind}.${row.key}`);
    return {
      ...row,
      label: named.startsWith('balance.') ? t(`praxisTypes.${row.key}`) : named,
    };
  });
  const vacancy = vacancyOf(snapshot.national, mode);

  // GP only: the practices without a district obligation of the same month
  // (the archive holds most months the map can show; another one shows a dash)
  const isGp = kind === 'gp';
  const tekMonth = isGp ? tekData?.months.find((m) => m.month === snapshot.month) ?? null : null;
  const tnOf = (key: string) => (tekMonth ? tekMonth.nonTerritorial.byType[key as 'adult'] ?? 0 : null);
  const tnTotal = tekMonth ? tekMonth.nonTerritorial.total : null;
  const cell = (n: number | null) => (n === null ? (tekData ? '–' : '…') : formatNumber(n));

  return (
    <section className="section container" id="allomany">
      <h2 className="section__heading">{tKind('balance.heading', kind)}</h2>
      <div className="balance__panel">
        {/* the whole stock as one bar, in the manner of the bars by type: the
            counts on the segments, the headline rate at the end of the row */}
        <div className="balance__main" role="img" aria-label={t(dissolved && mode === 'with'
          ? 'balance.shareWith' : 'balance.shareLabel', {
          count: formatNumber(vacancy.count), total: formatNumber(total),
        })}>
          <BalanceTotalBar
            parts={[
              { key: 'filled', n: filled }, { key: 'vacant', n: vacant }, { key: 'dissolved', n: dissolved },
            ]}
            rate={vacancy.rate !== null ? formatPercent(vacancy.rate) : '–'}
            rateLabel={t(dissolved && mode === 'with' ? 'balance.rateShortWith' : 'balance.rateShort')} />
        </div>
        {/* the colour keys on the left, the date and the source closed right */}
        <div className="balance__keyrow">
          <BalanceLegend items={[
            { key: 'filled', label: t('balance.legendFilled') },
            { key: 'vacant', label: t('balance.legendVacant') },
            ...(dissolved > 0 ? [{ key: 'dissolved' as const, label: t('balance.legendDissolved') }] : []),
            ...(isGp && tekMonth ? [{ key: 'tn' as const, label: t('balance.legendTn') }] : []),
          ]} />
          <small className="balance__source">{formatMonth(snapshot.month)} · {t('site.sourceShort')}</small>
        </div>
        {dissolved > 0 && <div className="balance__meta"><DissolvedSwitch /></div>}

        {/* the split by type, always open: a stacked bar chart, or the same
            numbers as a Mantine-style table */}
        <div className="balance__details">
          <div className="balance__viewbar">
            <h3 className="balance__subhead">{t('balance.byType')}</h3>
            <SegmentedControl<'chart' | 'table'> size="xs" ariaLabel={t('balance.view')}
              value={view} onChange={setView}
              options={[
                { value: 'chart', label: t('balance.viewChart') },
                { value: 'table', label: t('balance.viewTable') },
              ]} />
          </div>
          {view === 'chart' ? (
            <BalanceTypeChart showTn={isGp && tekMonth !== null} legend={false}
              rows={rows.map((r) => ({ ...r, tn: tnOf(r.key) }))} />
          ) : (
            <div className={`balance__tablewrap mtable-wrap${isGp ? ' balance__tablewrap--gp' : ''}`}>
              <table className="balance__types mtable mtable--striped mtable--hover">
                <thead>
                  <tr>
                    <th>{t('balance.thType')}</th>
                    <th className="is-num">{t('balance.thTotal')}</th>
                    <th className="is-num">{t('stats.statusFilled')}</th>
                    <th className="is-num">{t('stats.statusVacant')}</th>
                    <th className="is-num">{t('balance.thRate')}{dissolved > 0
                      && ` (${t(mode === 'with' ? 'dissolved.withShort' : 'dissolved.withoutShort')})`}</th>
                    {isGp && <th className="is-num balance__tekcol">{t('balance.thNon')}</th>}
                    {isGp && <th className="is-num balance__tekcol">{t('balance.thAllPractices')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <td>{r.label}</td>
                      <td className="is-num">{formatNumber(r.total)}</td>
                      <td className="is-num">{formatNumber(r.filled)}</td>
                      <td className="is-num">{formatNumber(r.vacant)}</td>
                      <td className="is-num"><span className="balance__rateVal">{formatPercent(r.rate)}</span></td>
                      {isGp && <td className="is-num balance__tekcol">{cell(tnOf(r.key))}</td>}
                      {isGp && <td className="is-num balance__tekcol">
                        {cell(tnOf(r.key) === null ? null : r.total + (tnOf(r.key) ?? 0))}</td>}
                    </tr>
                  ))}
                  {isGp && (
                    <tr className="is-total">
                      <td>{t('balance.totalRow')}</td>
                      <td className="is-num">{formatNumber(total)}</td>
                      <td className="is-num">{formatNumber(filled)}</td>
                      <td className="is-num">{formatNumber(vacant)}</td>
                      <td className="is-num"><span className="balance__rateVal">{vacancy.rate !== null ? formatPercent(vacancy.rate) : '–'}</span></td>
                      <td className="is-num balance__tekcol">{cell(tnTotal)}</td>
                      <td className="is-num balance__tekcol">{cell(tnTotal === null ? null : total + tnTotal)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <p className="balance__note">
            {tKind('balance.note', kind)}{' '}
            {view === 'chart' && t(isGp && tekMonth ? 'balance.chartScale' : 'balance.chartScaleDental')}
            {dissolved > 0 && mode === 'without' && ` ${t('balance.dissolvedNote', {
              n: formatNumber(dissolved),
            })}`}
            {dissolved > 0 && mode === 'with' && ` ${t('balance.dissolvedCounted', {
              n: formatNumber(dissolved),
            })}`}
          </p>
          {isGp && tnTotal !== null && (
            <p className="balance__tekclarify">{t('balance.tekClarify', {
              districts: formatNumber(total), all: formatNumber(total + tnTotal), tn: formatNumber(tnTotal),
            })}</p>
          )}
          {isGp && (
            <a className="balance__tekcard" href="/tek-nelkul.html">
              <span className="balance__tekcard-icon" aria-hidden="true"><IconStethoscope /></span>
              <span className="balance__tekcard-body">
                <strong>{t('balance.tekLinkTitle')}</strong>
                <span>{t('balance.tekLinkText')}</span>
              </span>
              <span className="balance__tekcard-arrow" aria-hidden="true">→</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
