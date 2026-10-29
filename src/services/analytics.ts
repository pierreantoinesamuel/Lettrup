import posthog from '../lib/posthog';
import { hasAnalyticsConsent } from './cookieConsent';

export async function logUserActivity(userId: string, action: string, details?: Record<string, any>): Promise<void> {
  if (!hasAnalyticsConsent()) {
    return;
  }
  posthog.capture(action, { userId, ...details });
}
