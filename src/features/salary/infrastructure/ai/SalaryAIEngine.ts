import { AIProviderRegistry } from '../../../../shared/ai/AIProviderRegistry';
import { AI_PROMPTS } from '../../../../domain/constants/aiPrompts';

export interface SalaryEstimateResult {
  currency: string;
  minSalary: number;
  medianSalary: number;
  maxSalary: number;
  percentile25: number;
  percentile75: number;
  marketTrend: string;
  negotiationTips: string[];
}

export class SalaryAIEngine {
  private registry = AIProviderRegistry.getInstance();

  async estimateSalaryRange(
    jobTitle: string,
    location: string,
    yearsExp: number,
    skills: string[]
  ): Promise<SalaryEstimateResult> {
    const provider = await this.registry.getFor('salary');
    const prompt = AI_PROMPTS.salary.estimate(jobTitle, location, yearsExp, skills);
    const res = await provider.complete({ prompt, responseMimeType: 'application/json' });

    try {
      return JSON.parse(res.text);
    } catch {
      const base = 45000 + yearsExp * 4000;
      return {
        currency: 'EUR',
        minSalary: Math.round(base * 0.85),
        medianSalary: Math.round(base),
        maxSalary: Math.round(base * 1.25),
        percentile25: Math.round(base * 0.9),
        percentile75: Math.round(base * 1.15),
        marketTrend: 'Forte demande sur le marché pour les profils ayant des compétences en Cloud et TypeScript.',
        negotiationTips: [
          'Mettez en avant vos réalisations chiffrées plutôt que le nombre d\'années d\'expérience.',
          'Négociez le package global (prime de performance, jours de télétravail, budget formation).',
          'Valorisez votre polyvalence Full Stack et votre autonomie.',
        ],
      };
    }
  }
}

export const salaryAIEngine = new SalaryAIEngine();
