// Entry point of adatkezeles.html — the privacy notice.
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './lib/measure';
import { locale } from './lib/i18n';
import { PrivacyPage } from './components/PrivacyPage';

function Page() {
  useEffect(() => {
    document.documentElement.lang = locale;
    // no branch on this page: the neutral accent, so blue and green only
    // ever mean GP and dentist (index.css [data-kind='none'])
    document.documentElement.dataset.kind = 'none';
  }, []);
  return <PrivacyPage />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
