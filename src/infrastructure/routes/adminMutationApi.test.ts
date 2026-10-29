import { mutationSchema } from './adminMutationApi';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
}

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

export function runAdminMutationApiTests() {
  let testCount = 0;

  // Test 1: rejects an unknown action instead of falling through to a default table/update
  testCount++;
  assert(
    mutationSchema.safeParse({ action: 'delete_everything', targetId: VALID_UUID, values: {} }).success === false,
    'An action outside the fixed enum must be rejected'
  );

  // Test 2: rejects a non-UUID targetId (prevents feeding an arbitrary string into a .eq('id', ...) filter)
  testCount++;
  assert(
    mutationSchema.safeParse({ action: 'account_status', targetId: 'not-a-uuid', values: { status: 'suspended' } })
      .success === false,
    'A non-UUID targetId must be rejected'
  );

  // Test 3: accepts a well-formed request and defaults `values` to {} when omitted
  testCount++;
  const parsed = mutationSchema.safeParse({ action: 'job_status', targetId: VALID_UUID, values: { status: 'active' } });
  assert(parsed.success === true, 'A well-formed mutation request must be accepted');

  const withoutValues = mutationSchema.safeParse({ action: 'application_status', targetId: VALID_UUID });
  assert(withoutValues.success === true, 'Omitting `values` must be accepted and default to {}');
  if (withoutValues.success) {
    assert(Object.keys(withoutValues.data.values).length === 0, '`values` must default to an empty object');
  }

  return { testCount };
}
