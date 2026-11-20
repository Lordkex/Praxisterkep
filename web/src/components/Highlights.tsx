// Two findings from the analysis page, on the landing: one for each branch,
// each new — something the monthly lists alone do not say — and each a link
// to the section that shows how it was made.
import { t } from '../lib/i18n';
import { formatNumber, formatPercent } from '../lib/format';
import { contextHref } from '../lib/context';
import { EuropeHighlights } from './EuropeHighlights';
import { useHighlights } from '../lib/highlights';
import { Emph } from './Emph';
import { IconStethoscope, IconTooth } from './icons';

export function Highlights() {
  const data = useHighlights();
  if (!data) return null;
  const { gp, dental } = data;
  return (
    <section className="section container highlights" aria-label={t('highlights.heading')}>
      <h2 className="section__heading">{t('highlights.heading')}</h2>
      <div className="highlights__grid">
        <a className="highlight" href={contextHref('/elemzo.html#tamogatasok')}>
          <span className="highlight__kind"><IconStethoscope />{t('kinds.gp.label')}</span>
          <span className="highlight__numbers">
            <b>{formatPercent(gp.grantsFilled, 0)}</b>
            <span className="highlight__vs">{t('highlights.vs')}</span>
            <b className="is-dim">{formatPercent(gp.matchedFilled, 0)}</b>
          </span>
          <span className="highlight__text"><Emph text={t('highlights.gp', {
            // the template carries the "%" itself, so its case ending never
            // hangs on a number
            a: formatNumber(Math.round(gp.grantsFilled * 100)),
            b: formatNumber(Math.round(gp.matchedFilled * 100)),
            pairs: formatNumber(gp.pairs) })} /></span>
          <span className="highlight__more">{t('highlights.more')}</span>
        </a>
        <a className="highlight" href={contextHref('/elemzo.html#tulel')}>
          <span className="highlight__kind"><IconTooth />{t('kinds.dental.label')}</span>
          <span className="highlight__numbers">
            <b>{formatNumber(dental.tenYears)}</b>
            <span className="highlight__unit">{t('highlights.tenYears')}</span>
          </span>
          <span className="highlight__text"><Emph text={t('highlights.dental', {
            vacant: formatNumber(dental.vacant), n: formatNumber(dental.tenYears),
            share: formatPercent(dental.tenYears / dental.vacant, 0) })} /></span>
          <span className="highlight__more">{t('highlights.more')}</span>
        </a>
      </div>
      <EuropeHighlights />
    </section>
  );
}
