import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1, // Sample rate for common sessions
  replaysOnErrorSampleRate: 1.0, // Sample rate for sessions when an error occurs

  // Setting this option to true will print useful information to the console when SDK is initializing
  debug: false,
});
