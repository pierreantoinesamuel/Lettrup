/**
 * Entity: TrialLifecycle
 * Manages user trial state, email reminder tracking, and transitions.
 */

import { TrialLifecycleState } from './TrialLifecycleState';
import { EngagementRecord, wasEngagedDuringTrial } from './EngagementRecord';

export interface RemindersSent {
  day2: boolean;
  reminder1: boolean;
  reminder2: boolean;
  reminder3: boolean;
}

export interface TrialLifecycle {
  userId: string;
  trialStartedAt: string;
  trialEndsAt: string;
  scheduledCancellationAt: string;
  state: TrialLifecycleState;
  remindersSent: RemindersSent;
  cancelledAt: string | null;
  createdAt?: string;
}

/**
 * Pure transition function: Evaluates trial expiry at day 7.
 * - Engaged during trial -> active_unpaid_locked (features gated)
 * - Not engaged during trial -> blocked (hard lock)
 * Idempotent: calling on an already transitioned record is a no-op.
 */
export function evaluateTrialExpiry(
  lifecycle: TrialLifecycle,
  engagement: EngagementRecord
): TrialLifecycle {
  if (lifecycle.state !== 'trialing') {
    return lifecycle;
  }

  const isEngaged = wasEngagedDuringTrial(
    lifecycle.trialStartedAt,
    lifecycle.trialEndsAt,
    engagement.lastActiveAt
  );

  return {
    ...lifecycle,
    state: isEngaged ? 'active_unpaid_locked' : 'blocked',
  };
}

/**
 * Pure transition function: Evaluates final cancellation at day 45 post-trial.
 * If now >= scheduledCancellationAt and user has not paid and state is not active_paid or cancelled,
 * transition to 'cancelled'.
 */
export function evaluateFinalCancellation(
  lifecycle: TrialLifecycle,
  now: Date | string,
  hasPaid: boolean
): TrialLifecycle {
  const nowMs = new Date(now).getTime();
  const schedMs = new Date(lifecycle.scheduledCancellationAt).getTime();

  if (
    lifecycle.state === 'active_paid' ||
    lifecycle.state === 'cancelled' ||
    hasPaid ||
    nowMs < schedMs
  ) {
    return lifecycle;
  }

  return {
    ...lifecycle,
    state: 'cancelled',
    cancelledAt: new Date(now).toISOString(),
  };
}
