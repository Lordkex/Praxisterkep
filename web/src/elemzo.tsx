// Entry point of the analysis page (elemzo.html).
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './lib/measure';
import { locale } from './lib/i18n';
import { useContextStore } from './lib/context';
import { useAppStore } from './store/useAppStore';
import { AnalysisPage } from './components/AnalysisPage';

function Page() {
  const loadData = useAppStore((s) => s.loadData);
  const kind = useContextStore((s) => s.kind);
  useEffect(() => {
    document.documentElement.lang = locale;
    void loadData(); // the county bounds and labels come from the snapshot store
  }, [loadData]);
  // the branch picked on the page colours it, as on the county page: it was
  // always green here, the dental colour, even with the GP view open
  useEffect(() => {
    document.documentElement.dataset.kind = kind;
  }, [kind]);
  return <AnalysisPage />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
