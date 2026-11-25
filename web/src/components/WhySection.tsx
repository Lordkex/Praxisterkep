// "Miért számít az alapellátás?" — three short pillars, then the prevention
// chain playing on its own. Qualitative public-health context only; the one
// count the chain shows comes from our own sourced snapshot.
import { t } from '../lib/i18n';
import { IconChild, IconStethoscope, IconTooth } from './icons';
import { PreventionStory } from './PreventionStory';
import { Emph } from './Emph';

const PILLARS = [
  { key: 'gp', Icon: IconStethoscope },
  { key: 'ped', Icon: IconChild },
  { key: 'dental', Icon: IconTooth },
] as const;

export function WhySection() {
  return (
    <section className="section container why" id="alapellatas">
      <h2 className="section__heading">{t('why.heading')}</h2>
      <p className="why__lead">{t('why.lead')}</p>

      <div className="why__pillars">
        {PILLARS.map(({ key, Icon }) => (
          <article className="why-pillar" key={key}>
            <div className="why-pillar__head">
              <div className="why-pillar__icon" aria-hidden="true"><Icon /></div>
              <h3>{t(`why.${key}.title`)}</h3>
            </div>
            <p><Emph text={t(`why.${key}.text`)} /></p>
          </article>
        ))}
      </div>

      <PreventionStory />
      <p className="why__disclaimer">{t('why.disclaimer')}</p>
    </section>
  );
}
