import {
  wasEngagedDuringTrial,
} from './EngagementRecord';
import {
  TrialLifecycle,
  evaluateTrialExpiry,
  evaluateFinalCancellation,
} from './TrialLifecycle';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
}

export function runBillingDomainTests() {
  let testCount = 0;

  // Test 1: wasEngagedDuringTrial - null or outside range returns false
  testCount++;
  const start = '2026-07-01T00:00:00Z';
  const end = '2026-07-08T00:00:00Z';

  assert(
    wasEngagedDuringTrial(start, end, null) === false,
    'Null lastActiveAt should return false'
  );
  assert(
    wasEngagedDuringTrial(start, end, '2026-06-30T23:59:59Z') === false,
    'Active date before trial start should return false'
  );
  assert(
    wasEngagedDuringTrial(start, end, '2026-07-09T00:00:00Z') === false,
    'Active date after trial end should return false'
  );

  // Test 2: wasEngagedDuringTrial - within range returns true
  testCount++;
  assert(
    wasEngagedDuringTrial(start, end, '2026-07-05T12:00:00Z') === true,
    'Active date inside trial window should return true'
  );

  // Test 3: evaluateTrialExpiry transitions engaged to active_unpaid_locked, unengaged to blocked
  testCount++;
  const baseLifecycle: TrialLifecycle = {
    userId: 'usr-1',
    trialStartedAt: start,
    trialEndsAt: end,
    scheduledCancellationAt: '2026-08-22T00:00:00Z',
    state: 'trialing',
    remindersSent: { day2: false, reminder1: false, reminder2: false, reminder3: false },
    cancelledAt: null,
  };

  const engagedResult = evaluateTrialExpiry(baseLifecycle, {
    userId: 'usr-1',
    lastActiveAt: '2026-07-03T10:00:00Z',
  });
  assert(
    engagedResult.state === 'active_unpaid_locked',
    'Engaged trial should transition to active_unpaid_locked'
  );

  const unengagedResult = evaluateTrialExpiry(baseLifecycle, {
    userId: 'usr-1',
    lastActiveAt: null,
  });
  assert(
    unengagedResult.state === 'blocked',
    'Unengaged trial should transition to blocked'
  );

  // Test 4: evaluateTrialExpiry idempotency
  testCount++;
  const alreadyLocked = { ...baseLifecycle, state: 'active_unpaid_locked' as const };
  const doubleCall = evaluateTrialExpiry(alreadyLocked, { userId: 'usr-1', lastActiveAt: '2026-07-03T10:00:00Z' });
  assert(
    doubleCall.state === 'active_unpaid_locked',
    'evaluateTrialExpiry must be idempotent'
  );

  // Test 5: evaluateFinalCancellation respects boundary and hasPaid guard
  testCount++;
  const schedCancel = '2026-08-22T00:00:00Z';
  const lockedLifecycle: TrialLifecycle = {
    ...baseLifecycle,
    state: 'active_unpaid_locked',
    scheduledCancellationAt: schedCancel,
  };

  // One second before scheduled cancellation date -> no transition
  const beforeTime = '2026-08-21T23:59:59Z';
  const beforeResult = evaluateFinalCancellation(lockedLifecycle, beforeTime, false);
  assert(
    beforeResult.state === 'active_unpaid_locked',
    'Before scheduled cancellation time should remain in current state'
  );

  // Exactly at scheduled cancellation date -> transitions to cancelled
  const atTime = '2026-08-22T00:00:00Z';
  const atResult = evaluateFinalCancellation(lockedLifecycle, atTime, false);
  assert(
    atResult.state === 'cancelled' && atResult.cancelledAt !== null,
    'At scheduled cancellation time should transition to cancelled'
  );

  // If user has paid -> remains active_paid / no cancellation
  const paidResult = evaluateFinalCancellation(lockedLifecycle, atTime, true);
  assert(
    paidResult.state === 'active_unpaid_locked',
    'Paid user should not be cancelled'
  );

  return { passed: true, testCount };
}
