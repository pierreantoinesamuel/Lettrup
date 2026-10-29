import * as Sentry from '@sentry/react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {setupPostHog} from './lib/posthog';

// Error tracking is a no-op until a real Sentry project (VITE_SENTRY_DSN) is
// configured — never call Sentry.init with an empty dsn.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
}

// Product analytics: only activates once the user has granted cookie
// consent, and stays in sync with later consent changes (see cookieConsent.ts).
setupPostHog();

createRoot(document.getElementById('root')!).render(
  <Sentry.ErrorBoundary
    fallback={() => (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Une erreur est survenue.</p>
      </div>
    )}
  >
    <App />
  </Sentry.ErrorBoundary>
);
