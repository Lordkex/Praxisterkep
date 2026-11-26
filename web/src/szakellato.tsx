// Entry point of the specialist-care page (szakellato.html).
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './lib/measure';
import { locale } from './lib/i18n';
import { SpecialistPage } from './components/SpecialistPage';

function Page() {
  useEffect(() => {
    document.documentElement.lang = locale;
    // no branch on this page: the neutral accent, so blue and green only
    // ever mean GP and dentist (index.css [data-kind='none'])
    document.documentElement.dataset.kind = 'none';
  }, []);
  return <SpecialistPage />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
