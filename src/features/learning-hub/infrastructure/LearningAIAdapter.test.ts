import { AIProviderRegistry } from '../../../shared/ai/AIProviderRegistry';
import { LearningAIAdapter } from './LearningAIAdapter';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[TEST FAILED] ${message}`);
}

export async function runLearningAiValidationTests() {
  let testCount = 0;
  const registry = {
    getFor: async () => ({ name: 'test-provider', complete: async () => ({ text: '{}' }) }),
  } as unknown as Pick<AIProviderRegistry, 'getFor'>;
  const adapter = new LearningAIAdapter(registry);

  testCount++;
  let invalidGapRejected = false;
  try {
    await adapter.analyzeSkillGap({ goalId: 'goal-1', targetRole: 'Analyste', currentSkills: [] });
  } catch {
    invalidGapRejected = true;
  }
  assert(invalidGapRejected, 'Incomplete skill-gap responses must be rejected instead of filled with generic skills');

  testCount++;
  const fencedRegistry = {
    getFor: async () => ({
      name: 'test-provider',
      complete: async () => ({
        text: `Here is the JSON:
\`\`\`json
{
  "goalId": "goal-2",
  "targetRole": "Data analyst senior",
  "strengths": [{"skill": "SQL", "level": 3, "evidence": "Profile skill"}],
  "gaps": [{"skill": "Modélisation statistique", "currentLevel": 1, "targetLevel": 4, "priority": "high", "demandCount": 3, "rationale": "Nécessaire pour le poste cible"}],
  "summary": "Résumé exploitable."
}
\`\`\``,
      }),
    }),
  } as unknown as Pick<AIProviderRegistry, 'getFor'>;
  const fencedAdapter = new LearningAIAdapter(fencedRegistry);
  const fencedReport = await fencedAdapter.analyzeSkillGap({
    goalId: 'goal-2',
    targetRole: 'Data analyst senior',
    currentSkills: [{ skill: 'SQL' }],
  });
  assert(fencedReport.gaps.length === 1, 'Skill-gap parser must accept fenced JSON responses');

  testCount++;
  let invalidRoadmapRejected = false;
  try {
    await adapter.generateRoadmap({
      report: {
        goalId: 'goal-1',
        targetRole: 'Analyste',
        strengths: [],
        gaps: [],
        summary: 'Résumé des écarts.',
        generatedAt: new Date().toISOString(),
        source: 'ai',
        promptVersion: 1,
        lang: 'fr',
      },
      hoursPerWeek: 5,
      timeframeMonths: 6,
    });
  } catch {
    invalidRoadmapRejected = true;
  }
  assert(invalidRoadmapRejected, 'Incomplete roadmap responses must be rejected instead of filled with generic milestones');

  return { testCount };
}
