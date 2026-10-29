import { AIProviderRegistry } from '../../../../shared/ai/AIProviderRegistry';
import { AI_PROMPTS } from '../../../../domain/constants/aiPrompts';

export interface ATSScanResult {
  atsScore: number;
  matchSummary: string;
  foundKeywords: string[];
  missingKeywords: string[];
  criticalWarnings: string[];
  tailoredBulletPoints: string[];
}

export class ATSAIEngine {
  constructor(private readonly registry = AIProviderRegistry.getInstance()) {}

  async analyzeJobMatch(jobDescription: string, resumeText: string): Promise<ATSScanResult> {
    try {
      if (!jobDescription.trim() || !resumeText.trim()) {
        throw new Error('Job description and resume text are required.');
      }

      const provider = await this.registry.getFor('ats-engine');
      const prompt = AI_PROMPTS.ats.scan(jobDescription, resumeText);
      const res = await provider.complete({ prompt, responseMimeType: 'application/json' });
      if (!res?.text) throw new Error('The ATS provider returned an empty response.');

      const cleanText = res.text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanText);
      if (!parsed || typeof parsed.atsScore !== 'number' || !Number.isFinite(parsed.atsScore)) {
        throw new Error('The ATS provider returned an invalid score.');
      }

      return {
        atsScore: Math.min(100, Math.max(0, Math.round(parsed.atsScore))),
        matchSummary: typeof parsed.matchSummary === 'string' ? parsed.matchSummary : '',
        foundKeywords: Array.isArray(parsed.foundKeywords) ? parsed.foundKeywords.filter((value: unknown) => typeof value === 'string') : [],
        missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords.filter((value: unknown) => typeof value === 'string') : [],
        criticalWarnings: Array.isArray(parsed.criticalWarnings) ? parsed.criticalWarnings.filter((value: unknown) => typeof value === 'string') : [],
        tailoredBulletPoints: Array.isArray(parsed.tailoredBulletPoints) ? parsed.tailoredBulletPoints.filter((value: unknown) => typeof value === 'string') : [],
      };
    } catch (err) {
      console.warn('[ATSAIEngine] AI analysis failed; no ATS score was produced.');
      throw new Error('Analyse ATS indisponible. Veuillez réessayer.');
    }
  }
}

export const atsAIEngine = new ATSAIEngine();
