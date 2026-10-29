import { AI_OPERATIONS, AI_MINIMUM_PLANS, argsSchema, MAX_TEXT_LENGTH } from './aiEngineApi';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
}

export function runAiEngineApiTests() {
  let testCount = 0;

  // Test 1: every dispatchable op has an explicit plan requirement — a
  // missing entry would make handleAiInvokeRoute reject the op for every
  // plan (since `minimumPlan` would be undefined), silently breaking a
  // feature instead of gating it, so this must never regress.
  testCount++;
  const opsWithoutPlan = Object.keys(AI_OPERATIONS).filter((op) => !AI_MINIMUM_PLANS[op]);
  assert(
    opsWithoutPlan.length === 0,
    `Every AI_OPERATIONS key must have an AI_MINIMUM_PLANS entry; missing: ${opsWithoutPlan.join(', ')}`
  );

  // Test 2: every configured plan requirement points at a real, dispatchable op
  // (a stale entry is harmless but signals dead/renamed config worth cleaning up).
  testCount++;
  const planEntriesWithoutOp = Object.keys(AI_MINIMUM_PLANS).filter((op) => !AI_OPERATIONS[op]);
  assert(
    planEntriesWithoutOp.length === 0,
    `Every AI_MINIMUM_PLANS key must match a real AI_OPERATIONS entry; stale: ${planEntriesWithoutOp.join(', ')}`
  );

  // Test 3: argsSchema shape — rejects empty args, rejects too many args, accepts a normal call
  testCount++;
  assert(argsSchema.safeParse([]).success === false, 'Empty args array must be rejected');
  assert(argsSchema.safeParse(new Array(9).fill('x')).success === false, 'More than 8 args must be rejected');
  assert(argsSchema.safeParse(['a', 'b']).success === true, 'A normal 2-arg call must be accepted');
  assert(argsSchema.safeParse('not-an-array' as any).success === false, 'A non-array args payload must be rejected');

  // Test 4: argsSchema enforces the per-arg length limit instead of silently accepting an oversized field
  testCount++;
  const oversizedString = 'a'.repeat(MAX_TEXT_LENGTH + 1);
  assert(argsSchema.safeParse([oversizedString]).success === false, 'An oversized string arg must be rejected');
  assert(
    argsSchema.safeParse(['a'.repeat(MAX_TEXT_LENGTH)]).success === true,
    'A string arg exactly at the limit must be accepted'
  );

  return { testCount };
}
