import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from "@sentry/react"
import './index.css'
import App from './App.jsx'

// Auto-recover from stale chunks after new deployments to prevent white screen
window.addEventListener('error', (e) => {
  if (e?.message?.includes('Failed to fetch dynamically imported module') || e?.message?.includes('Importing a module script failed') || e?.message?.includes('error loading dynamically imported module')) {
    if (!sessionStorage.getItem('chunk_reload_retry')) {
      sessionStorage.setItem('chunk_reload_retry', '1');
      window.location.reload();
    }
  }
});
window.addEventListener('load', () => {
  sessionStorage.removeItem('chunk_reload_retry');
});

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/wolfie-backend-pt9u\.onrender\.com/],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
