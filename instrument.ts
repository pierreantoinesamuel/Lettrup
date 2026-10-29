import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';

// @ts-ignore
dotenv.config({ path: '.env.local', quiet: true });

if (process.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.VITE_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
}
