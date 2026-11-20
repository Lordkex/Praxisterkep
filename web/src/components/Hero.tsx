// The landing's first screen: the question, the one-line answer to "what is
// this", and straight under it the search that answers it for the reader's
// own town (passed in as children). The caveat and the data date follow in
// small type: they qualify every number below, but they are not what a
// visitor came for. The branch's animated monthly picture closes the block.
import type { ReactNode } from 'react';
import { t } from '../lib/i18n';
import { formatMonth } from '../lib/format';
import { useAppStore, useSnapshot, useTimeseriesMonths } from '../store/useAppStore';
import { DissolvedSwitch } from './DissolvedSwitch';
import { LandingStory } from './story/PageStories';

export function Hero({ children }: { children?: ReactNode }) {
  const snapshot = useSnapshot()!;
  const kind = useAppStore((s) => s.kind);
  const monthCount = useTimeseriesMonths().length;
  const doctor = t(`kinds.${kind}.doctor`);
  const adj = t(`kinds.${kind}.adj`);

  return (
    <header className="hero container">
      <h1>
        {t(`kinds.${kind}.question`).replace('?', '')}
        <span className="accent">?</span>
      </h1>
      <p className="hero__lead">{t('site.lead', { doctor })}</p>

      {children}

      <div className="hero__foot">
        <p className="hero__caveat">
          <strong>{t('hero.caveatLabel')}</strong>{' '}
          {t('hero.vacantVsUnserved', { doctor, kind: adj })}
        </p>
        <div className="hero__meta">
          <span>
            {t('site.lastUpdate')}: <b>{formatMonth(snapshot.month)}</b>
            {' · '}{t('site.sourceShort')}
            {monthCount === 1 && <> · {t('site.firstMonthNote')}</>}
          </span>
          {snapshot.national.dissolved > 0 && <DissolvedSwitch compact />}
        </div>
      </div>

      {/* the branch's monthly picture opens the page, as on every main page */}
      <LandingStory />
    </header>
  );
}
