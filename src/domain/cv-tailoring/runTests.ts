/**
 * Test Pipeline Entry Point
 * Invokes domain guardrail unit tests and outputs status.
 */

import { runCvTailoringGuardrailTests } from './TailoringGuardrail.test';

function main() {
  console.log('----------------------------------------------------');
  console.log('Running CV Pilot Phase 4a Guardrail Unit Tests...');
  console.log('----------------------------------------------------');

  try {
    const result = runCvTailoringGuardrailTests();
    console.log(`✅ SUCCESS: All ${result.testCount} domain guardrail tests PASSED!`);
    console.log('----------------------------------------------------');
    process.exit(0);
  } catch (error: any) {
    console.error(`❌ TEST FAILURE: ${error.message}`);
    console.log('----------------------------------------------------');
    process.exit(1);
  }
}

main();
