import { t } from '../lib/i18n';
import { ReferralBlock } from './ReferralBlock';
import { Deferred } from './Deferred';
import { METHOD_PARAGRAPHS } from '../lib/methodSections';
import { MethodStory } from './story/PageStories';

// The embed snippet lives with the downloads (DataSection), where the side
// menu lists it: here, between the referral list and the outcome methods, it
// lit the menu's very last item halfway down the page.
export function Methodology() {
  return (
    <section className="section container method" id="modszertan">
      <h2 className="section__heading">{t('methodology.heading')}</h2>
      <MethodStory />
      {METHOD_PARAGRAPHS.map((k) => (
        <div key={k} className="method__item" id={`m-${k}`}>
          <h3 className="why__chain-title">{t(`methodology.titles.${k}`)}</h3>
          <p>{t(`methodology.${k}`)}</p>
        </div>
      ))}
      <div id="m-referral">
        {/* 10 MB of referral list: fetched only when the reader gets here */}
        <Deferred minHeight={400}><ReferralBlock /></Deferred>
      </div>
    </section>
  );
}
