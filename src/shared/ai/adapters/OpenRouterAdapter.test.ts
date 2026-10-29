import { OpenRouterAdapter, FEATURE_OPENROUTER_MODELS } from './OpenRouterAdapter';

export function runOpenRouterModelTieringTests() {
  console.log('--- Testing OpenRouter Per-Feature Model Tiering ---');
  let testCount = 0;

  // Verify feature mapping definitions
  if (FEATURE_OPENROUTER_MODELS['resume-builder'] !== 'anthropic/claude-sonnet-5') {
    throw new Error('Test 1 failed: resume-builder should map to anthropic/claude-sonnet-5');
  }
  testCount++;

  if (FEATURE_OPENROUTER_MODELS['outreach'] !== 'anthropic/claude-3-haiku') {
    throw new Error('Test 2 failed: outreach should map to anthropic/claude-3-haiku');
  }
  testCount++;

  if (FEATURE_OPENROUTER_MODELS['ats-engine'] !== 'anthropic/claude-3-haiku') {
    throw new Error('Test 3 failed: ats-engine should map to anthropic/claude-3-haiku');
  }
  testCount++;

  return { testCount };
}
