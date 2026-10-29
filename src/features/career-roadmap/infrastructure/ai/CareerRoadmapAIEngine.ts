import { AIProviderRegistry } from '../../../../shared/ai/AIProviderRegistry';
import { AI_PROMPTS } from '../../../../domain/constants/aiPrompts';
import { z } from 'zod';

export interface CareerPathResult {
  estimatedMonths: number;
  milestones: Array<{
    phase: string;
    duration: string;
    keySkills: string[];
    actionItems: string[];
  }>;
}

const careerPathSchema = z.object({
  estimatedMonths: z.number().int().min(1).max(120),
  milestones: z.array(z.object({
    phase: z.string().trim().min(1),
    duration: z.string().trim().min(1),
    keySkills: z.array(z.string().trim().min(1)).min(1),
    actionItems: z.array(z.string().trim().min(1)).min(1),
  })).min(1),
});

const skillGapSchema = z.object({
  missingSkills: z.array(z.string().trim().min(1)),
  recommendation: z.string().trim().min(1),
});

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim());
  } catch {
    throw new Error('The career AI returned invalid JSON.');
  }
}

export function parseCareerPathResult(text: string): CareerPathResult {
  const parsed = careerPathSchema.safeParse(parseJson(text));
  if (!parsed.success) throw new Error('The career AI returned an incomplete roadmap.');
  return parsed.data;
}

export function parseCareerSkillGapResult(text: string): { missingSkills: string[]; recommendation: string } {
  const parsed = skillGapSchema.safeParse(parseJson(text));
  if (!parsed.success) throw new Error('The career AI returned an incomplete skill-gap analysis.');
  return parsed.data;
}

export class CareerRoadmapAIEngine {
  private registry = AIProviderRegistry.getInstance();

  async generateCareerPath(
    currentRole: string,
    targetRole: string,
    yearsExp: number
  ): Promise<CareerPathResult> {
    const provider = await this.registry.getFor('career-roadmap');
    const prompt = AI_PROMPTS.careerRoadmap.generatePath(currentRole, targetRole, yearsExp);
    const res = await provider.complete({ prompt, responseMimeType: 'application/json' });
    return parseCareerPathResult(res.text || '');
  }

  async analyzeSkillGaps(currentSkills: string[], requiredSkills: string[]): Promise<{ missingSkills: string[]; recommendation: string }> {
    const provider = await this.registry.getFor('career-roadmap');
    const prompt = AI_PROMPTS.careerRoadmap.skillGaps(currentSkills, requiredSkills);
    const res = await provider.complete({ prompt, responseMimeType: 'application/json' });

    return parseCareerSkillGapResult(res.text || '');
  }
}

export const careerRoadmapAIEngine = new CareerRoadmapAIEngine();
