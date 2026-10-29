import { hasMinimumPlan, isActivePlan, isKnownPlan } from './entitlementService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
}

export function runEntitlementServiceTests() {
  let testCount = 0;

  // Test 1: isKnownPlan / isActivePlan reject unknown, expired-looking, and malformed values
  testCount++;
  assert(isKnownPlan('free_trial'), 'free_trial should be a known plan');
  assert(isKnownPlan('pro'), 'pro should be a known plan');
  assert(!isKnownPlan('enterprise'), 'Unknown plan string should not be a known plan');
  assert(!isKnownPlan(null), 'null should not be a known plan');
  assert(!isKnownPlan(undefined), 'undefined should not be a known plan');
  assert(!isKnownPlan(42), 'Non-string value should not be a known plan');
  assert(!isActivePlan('free_trial'), 'free_trial is not an active (paid) plan');
  assert(isActivePlan('max'), 'max should be an active plan');

  // Test 2: hasMinimumPlan ranks plans correctly (free_trial < pro == plus < max).
  // 'plus' was retired as a sellable tier (merged into 'pro') but stays a
  // recognized rank-1 alias — same rank as 'pro', not a step above it — so a
  // stray legacy row is never silently downgraded to the free tier.
  testCount++;
  assert(hasMinimumPlan('max', 'free_trial'), 'max should satisfy a free_trial minimum');
  assert(hasMinimumPlan('pro', 'pro'), 'pro should satisfy a pro minimum (equal rank)');
  assert(!hasMinimumPlan('pro', 'max'), 'pro should not satisfy a max minimum');
  assert(!hasMinimumPlan('free_trial', 'pro'), 'free_trial should not satisfy a pro minimum');
  assert(hasMinimumPlan('plus', 'pro'), 'legacy plus should satisfy a pro minimum (same rank alias)');
  assert(!hasMinimumPlan('plus', 'max'), 'legacy plus should not satisfy a max minimum (it ranks as pro, not above it)');

  // Test 3: hasMinimumPlan rejects unknown/invalid plan values outright (no silent downgrade to allow)
  testCount++;
  assert(!hasMinimumPlan('enterprise', 'free_trial'), 'Unknown plan value must never satisfy any minimum');
  assert(!hasMinimumPlan(null, 'free_trial'), 'null plan must never satisfy any minimum');
  assert(!hasMinimumPlan(undefined, 'free_trial'), 'undefined plan must never satisfy any minimum');
  assert(!hasMinimumPlan('', 'free_trial'), 'Empty string plan must never satisfy any minimum');

  return { testCount };
}
