// The top bar of every standalone page. It shows the same six-plus-one
// entries as the landing (lib/siteNav.ts) in the order of the zooms they
// offer, and every link carries the branch and the area on.
import { t } from '../lib/i18n';
import { contextHref } from '../lib/context';
import { ContextBar } from './ContextBar';
import { NavMenu } from './NavMenu';
import { LangToggle } from './LangToggle';
import { SITE_NAV, withContext } from '../lib/siteNav';
import { IconStethoscope, IconTooth } from './icons';
import { SegmentedControl } from './SegmentedControl';
import type { PraxisKind } from '../types';

interface Props {
  /** null hides the branch switch (pages that are not per-branch) */
  kind?: PraxisKind | null;
  onKind?: (kind: PraxisKind) => void;
}

export function PageNav({ kind = null, onKind }: Props) {
  const home = import.meta.env.BASE_URL;
  return (
    <>
    <nav className="topnav">
      <div className="topnav__inner">
        <a className="topnav__brand" href={contextHref(home)}>{t('site.title')}</a>
        {/* the same switch as the landing's: these were bare buttons with no
            style of their own, a grey block beside the brand */}
        {kind && onKind && (
          <SegmentedControl<PraxisKind> size="xs" className="topnav__kind"
            ariaLabel={t('search.kindLabel')} value={kind} onChange={onKind}
            options={[
              { value: 'gp', label: <IconStethoscope />, ariaLabel: t('kinds.gp.label'), title: t('kinds.gp.label') },
              { value: 'dental', label: <IconTooth />, ariaLabel: t('kinds.dental.label'), title: t('kinds.dental.label') },
            ]} />
        )}
        <LangToggle />
        <NavMenu entries={withContext(SITE_NAV)} />
      </div>
    </nav>
    <ContextBar />
    </>
  );
}
