/**
 * Value Object: Engagement Record and engagement evaluation during trial
 */

export interface EngagementRecord {
  userId: string;
  lastActiveAt: Date | string | null;
}

/**
 * Pure function: returns true if the user engaged in the app during the trial window [trialStartedAt, trialEndedAt].
 */
export function wasEngagedDuringTrial(
  trialStartedAt: Date | string,
  trialEndsAt: Date | string,
  lastActiveAt: Date | string | null
): boolean {
  if (!lastActiveAt) return false;

  const start = new Date(trialStartedAt).getTime();
  const end = new Date(trialEndsAt).getTime();
  const active = new Date(lastActiveAt).getTime();

  return active >= start && active <= end;
}
