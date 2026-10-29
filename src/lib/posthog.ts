import posthog from 'posthog-js';
import { hasAnalyticsConsent, onCookieConsentChange } from '../services/cookieConsent';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST;

let initialized = false;

function initPostHog(): void {
  if (initialized || !POSTHOG_KEY || !POSTHOG_HOST) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: true,
    autocapture: false,
  });
  initialized = true;
}

/**
 * Wires PostHog product analytics to the app's cookie-consent system.
 * - If the user has already consented to analytics cookies, initializes
 *   PostHog immediately.
 * - Subscribes to consent changes so that granting consent later (via the
 *   cookie banner, without a page reload) initializes PostHog at that point,
 *   and revoking consent tells the SDK to stop capturing.
 * Call this once, on app startup.
 */
export function setupPostHog(): void {
  if (hasAnalyticsConsent()) {
    initPostHog();
  }

  onCookieConsentChange((state) => {
    if (state.analytics) {
      if (!initialized) {
        initPostHog();
      } else {
        posthog.opt_in_capturing();
      }
    } else if (initialized) {
      posthog.opt_out_capturing();
    }
  });
}

export default posthog;
