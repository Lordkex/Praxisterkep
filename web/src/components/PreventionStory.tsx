// The prevention chain, animated: the same patient (mustard sweater) through
// four steps when the district has a doctor ("Van háziorvos") and four when
// it has none ("Nincs háziorvos"), for a GP or a dental district as the
// global switch says. The picture is drawn in cut paper on the stories'
// engine (components/story); the step's title and description stay HTML
// beside it, so they read the same in both themes and to a screen reader.
//
// It plays on its own once it is half in view and pauses while it is off
// screen. The rail between the numbered links is the clock: the stretch
// leading to the next link fills while the current step plays. The measured
// count of districts on this side of the chain sits on the picture itself,
// where it is actually seen. With reduced motion each step is shown finished
// and nothing moves on by itself.
import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n';
import { formatNumber } from '../lib/format';
import { useAppStore, useSnapshot } from '../store/useAppStore';
import { useStoryCanvas } from './story/useStoryCanvas';
import { drawPrevention, type Variant } from './story/prevention';
import type { Painter } from './story/paint';
import { SegmentedControl } from './SegmentedControl';
import './story/story.css';

const SCENE_MS = 6800;
/** the share of a step spent drawing itself in; the rest is the idle loop */
const PLAY_IN = 0.6;

function stageHeight(w: number): number {
  return w < 560 ? Math.max(250, w * 0.8) : Math.max(280, Math.min(380, w * 0.4));
}

function prefersReduced(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function PreventionStory() {
  const kind = useAppStore((s) => s.kind);
  const snapshot = useSnapshot();
  const [variant, setVariant] = useState<Variant>('ok');
  const [scene, setScene] = useState(0);
  // bumped on every manual selection so the step's clock starts again
  // instead of overriding the reader's choice a moment later
  const [timerGen, setTimerGen] = useState(0);
  const [started, setStarted] = useState(false);
  const [reduced] = useState(prefersReduced);
  const sceneStart = useRef(0);

  function switchVariant(v: Variant) {
    setVariant(v);
    setScene(0);
    setTimerGen((g) => g + 1);
  }

  function selectScene(i: number) {
    setScene(i);
    setTimerGen((g) => g + 1);
  }

  // the story follows the global dental/GP toggle
  const [shownKind, setShownKind] = useState(kind);
  if (shownKind !== kind) {
    setShownKind(kind);
    setVariant('ok');
    setScene(0);
    setTimerGen((g) => g + 1);
  }

  const draw = useCallback((p: Painter) => {
    const local = reduced ? 1 : (p.now - sceneStart.current) / (SCENE_MS * PLAY_IN);
    drawPrevention(p, kind, variant, scene, local);
  }, [kind, variant, scene, reduced]);
  const onSeen = useCallback(() => setStarted(true), []);
  const { wrap, canvas, size, visible } = useStoryCanvas(draw, {
    animate: !reduced, still: reduced, height: stageHeight, onSeen,
  });
  const running = started && visible && !reduced;

  // The step's clock. It only runs while the picture is on screen; time spent
  // away is not counted, so the reader comes back to the step they left and
  // the filling rail (a CSS animation paused in step with it) still agrees.
  const elapsed = useRef(0);
  const clockKey = useRef('');
  useEffect(() => {
    const key = `${scene}|${variant}|${timerGen}`;
    if (key !== clockKey.current) {
      clockKey.current = key;
      elapsed.current = 0;
      sceneStart.current = performance.now();
    }
    if (!running) return undefined;
    const from = performance.now();
    const id = window.setTimeout(() => setScene((s) => (s + 1) % 4),
      Math.max(0, SCENE_MS - elapsed.current));
    return () => {
      window.clearTimeout(id);
      elapsed.current += performance.now() - from;
    };
  }, [scene, variant, timerGen, running]);

  const chainKey = kind === 'dental'
    ? (variant === 'ok' ? 'chainOkDental' : 'chainBrokenDental')
    : (variant === 'ok' ? 'chainOk' : 'chainBroken');
  const titles = [0, 1, 2, 3].map((i) => t(`why.${chainKey}.${i}`));
  const descs = [0, 1, 2, 3].map((i) => t(`why.${chainKey}Desc.${i}`));
  // the other side's captions too, only to hold the caption box's height
  const otherKey = kind === 'dental'
    ? (variant === 'ok' ? 'chainBrokenDental' : 'chainOkDental')
    : (variant === 'ok' ? 'chainBroken' : 'chainOk');
  const toggleOk = t(kind === 'dental' ? 'why.storyToggleOkDental' : 'why.storyToggleOk');
  const toggleBroken = t(kind === 'dental' ? 'why.storyToggleBrokenDental' : 'why.storyToggleBroken');

  // The chain is an illustration, so it carries the measured thing it
  // illustrates: how many districts are on this side of it today. Both
  // numbers come from the snapshot — nothing here is drawn from the air.
  const adj = t(`kinds.${kind}.adj`);
  const national = snapshot?.national;
  const total = national?.totalDistricts ?? 0;
  const tie = !national ? null : variant === 'broken'
    ? {
      value: formatNumber(national.vacant),
      of: null,
      text: t('why.tieBroken', { kind: adj, people: formatNumber(national.populationVacant) }),
    }
    : total ? {
      value: formatNumber(total - national.vacant),
      of: formatNumber(total),
      text: t('why.tieOk', { kind: adj }),
    } : null;

  return (
    <div className={`story ${variant === 'broken' ? 'story--broken' : ''}`}>
      <div className="story__head">
        <h3 className="story__title">{t('why.chainTitle')}</h3>
        <SegmentedControl<Variant> variant="filled" size="md"
          tone={variant === 'ok' ? 'accent' : 'alert'}
          ariaLabel={t('why.chainTitle')}
          value={variant} onChange={switchVariant}
          options={[
            { value: 'ok', label: toggleOk },
            { value: 'broken', label: toggleBroken },
          ]} />
      </div>

      {/* The section is called a chain, so it is drawn as one: four named
          links, joined by a rail that fills as the story moves on. */}
      <ol className={`story__chain${running ? '' : ' is-paused'}`}>
        {titles.map((title, i) => {
          // the stretch of rail leading out of this link to the next one
          const rail = i === 3 ? null : i < scene ? 'done' : i === scene ? 'live' : 'idle';
          return (
            <li key={i}
              className={`${i === scene ? 'is-active' : ''} ${i < scene ? 'is-done' : ''}`}>
              {rail && (
                <span className={`story__rail story__rail--${rail}`} aria-hidden="true">
                  <i key={rail === 'live' ? `${variant}-${scene}-${timerGen}` : rail}
                    style={rail === 'live' ? { animationDuration: `${SCENE_MS}ms` } : undefined} />
                </span>
              )}
              <button onClick={() => selectScene(i)}
                aria-current={i === scene ? 'step' : undefined}>
                <span className="story__chain-dot">{i + 1}</span>
                <span className="story__chain-label">{title}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="story__stage cutstory-tokens">
        {/* all four captions share one grid cell, so the box is as tall as
            the longest of them and does not jump when a step's text runs to
            one line more or less; only the current one is shown */}
        <div className="story__caption">
          {titles.map((title, i) => (
            <div key={i === scene ? `${variant}-${scene}` : `idle-${i}`}
              className={`story__caption-item${i === scene ? ' is-current' : ''}`}
              aria-hidden={i === scene ? undefined : true}>
              <h4>{title}</h4>
              <p>{descs[i]}</p>
            </div>
          ))}
          {[0, 1, 2, 3].map((i) => (
            <div key={`other-${i}`} className="story__caption-item" aria-hidden="true">
              <h4>{t(`why.${otherKey}.${i}`)}</h4>
              <p>{t(`why.${otherKey}Desc.${i}`)}</p>
            </div>
          ))}
        </div>
        <div className="story__canvas" ref={wrap}>
          <canvas ref={canvas} role="img" aria-label={`${titles[scene]}: ${descs[scene]}`}
            style={{ width: size.w || '100%', height: size.h || 280 }} />
          {tie && (
            <p className="story__tie" key={`${kind}-${variant}`}>
              <span className="story__tie-value">
                {tie.value}
                {tie.of && <small> / {tie.of}</small>}
              </span>
              <span className="story__tie-text">{tie.text}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
