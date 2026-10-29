import { resolvePrimaryResume } from './PrimaryResume';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
}

export function runPrimaryResumeDomainTests() {
  let testCount = 0;

  // Test 1: explicit primary wins even when it isn't the most recently updated.
  // (The "CV Développeur" / "CV Chef de Projet" scenario: the PM resume was
  // touched most recently, but the candidate designated the dev resume primary.)
  testCount++;
  const pmResume = { id: 'pm', isPrimary: false };
  const devResume = { id: 'dev', isPrimary: true };
  assert(
    resolvePrimaryResume([pmResume, devResume])?.id === 'dev',
    'Explicit primary should win over recency'
  );

  // Test 2: no explicit primary set falls back to the most recent (first) resume
  testCount++;
  const noPrimaryA = { id: 'a', isPrimary: false };
  const noPrimaryB = { id: 'b', isPrimary: false };
  assert(
    resolvePrimaryResume([noPrimaryA, noPrimaryB])?.id === 'a',
    'With no primary set, the most recently updated (first) resume should win'
  );

  // Test 3: empty list returns null
  testCount++;
  assert(resolvePrimaryResume([]) === null, 'Empty resume list should resolve to null');

  // Test 4: a single resume is returned regardless of its isPrimary flag
  testCount++;
  const onlyResume = { id: 'only', isPrimary: false };
  assert(
    resolvePrimaryResume([onlyResume])?.id === 'only',
    'A single resume should resolve to itself even when not flagged primary'
  );

  return { testCount };
}
