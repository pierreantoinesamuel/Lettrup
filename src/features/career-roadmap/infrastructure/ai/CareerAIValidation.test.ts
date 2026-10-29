import { parseCareerPathResult, parseCareerSkillGapResult } from './CareerRoadmapAIEngine';
import { parseCareerStrategyResult } from '../../../../features/ai-coach/infrastructure/ai/CareerCoachAIEngine';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[TEST FAILED] ${message}`);
}

export function runCareerAiValidationTests() {
  let testCount = 0;
  for (const parse of [parseCareerPathResult, parseCareerSkillGapResult, parseCareerStrategyResult]) {
    testCount++;
    let rejected = false;
    try {
      parse('{}');
    } catch {
      rejected = true;
    }
    assert(rejected, 'Incomplete career AI responses must not be replaced by generic plans');
  }

  return { testCount };
}