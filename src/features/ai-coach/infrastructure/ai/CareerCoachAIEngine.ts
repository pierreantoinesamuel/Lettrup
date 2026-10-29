import { AIProviderRegistry } from '../../../../shared/ai/AIProviderRegistry';
import { AI_PROMPTS } from '../../../../domain/constants/aiPrompts';
import { z } from 'zod';

export interface StrategyPipelineResult {
  overview: string;
  pillars: Array<{
    title: string;
    description: string;
    actionableSteps: string[];
  }>;
  weeklyRoutine: string[];
  successMetrics: string[];
}

const strategyPipelineSchema = z.object({
  overview: z.string().trim().min(1),
  pillars: z.array(z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    actionableSteps: z.array(z.string().trim().min(1)).min(1),
  })).min(1),
  weeklyRoutine: z.array(z.string().trim().min(1)).min(1),
  successMetrics: z.array(z.string().trim().min(1)).min(1),
});

export function parseCareerStrategyResult(text: string): StrategyPipelineResult {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim());
  } catch {
    throw new Error('The career strategy AI returned invalid JSON.');
  }

  const parsed = strategyPipelineSchema.safeParse(parsedJson);
  if (!parsed.success) throw new Error('The career strategy AI returned an incomplete strategy.');
  return parsed.data;
}

export class CareerCoachAIEngine {
  private registry = AIProviderRegistry.getInstance();

  async generateCareerStrategyPipeline(
    profileOverview: string,
    goals: string[]
  ): Promise<StrategyPipelineResult> {
    const provider = await this.registry.getFor('ai-coach');
    const prompt = AI_PROMPTS.aiCoach.strategyPipeline(profileOverview, goals);
    const res = await provider.complete({ prompt, responseMimeType: 'application/json' });

    return parseCareerStrategyResult(res.text || '');
  }
}

export const careerCoachAIEngine = new CareerCoachAIEngine();
