import {
  LINKEDIN_CONNECTION_NOTE_MAX_LENGTH,
  enforceOutreachChannelConstraints,
} from './OutreachMessage';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
}

export function runOutreachDomainTests() {
  let testCount = 0;

  // Test 1: Max length constant is 300
  testCount++;
  assert(
    LINKEDIN_CONNECTION_NOTE_MAX_LENGTH === 300,
    `LINKEDIN_CONNECTION_NOTE_MAX_LENGTH must be 300, got ${LINKEDIN_CONNECTION_NOTE_MAX_LENGTH}`
  );

  // Test 2: Connection note > 300 chars is deterministically truncated to exactly 300
  testCount++;
  const longNote = 'A'.repeat(350);
  const truncated = enforceOutreachChannelConstraints('linkedin_connection_note', longNote);
  assert(
    truncated.length === 300,
    `Expected truncated length to be 300, got ${truncated.length}`
  );

  // Test 3: Connection note <= 300 chars remains unchanged
  testCount++;
  const validNote = 'Bonjour, je suis très intéressé par le poste de Développeur chez Google.';
  const resultNote = enforceOutreachChannelConstraints('linkedin_connection_note', validNote);
  assert(
    resultNote === validNote,
    'Valid note <= 300 chars should not be modified'
  );

  // Test 4: Other channels (linkedin_message, cold_email) allow > 300 chars
  testCount++;
  const longEmail = 'Email body '.repeat(40); // > 400 chars
  const emailResult = enforceOutreachChannelConstraints('cold_email', longEmail);
  assert(
    emailResult.length > 300,
    'Cold email should not be truncated at 300 characters'
  );

  return { passed: true, testCount };
}
