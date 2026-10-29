import { ILearningAI, GapAnalysisInput, RoadmapInput } from '../ports/ILearningAI';
import { SkillGapReport, Roadmap, ResourceRef, SkillLevel } from '../domain/types';
import { AIProviderRegistry } from '../../../shared/ai/AIProviderRegistry';
import { SkillGapReportSchema, RoadmapSchema } from '../domain/schemas/learning.schema';
import { buildSearchUrl } from '../domain/services/buildSearchUrl';
import { SkillDependencyResolver } from '../domain/services/SkillDependencyResolver';
import { LearningAIError, LearningValidationError } from '../domain/errors';

export class LearningAIAdapter implements ILearningAI {
  private static readonly PROMPT_VERSION = 1;

  constructor(private readonly registry: Pick<AIProviderRegistry, 'getFor'> = AIProviderRegistry.getInstance()) {}

  private sanitizeText(input: string): string {
    return input.replace(/[{}<>]/g, '').slice(0, 4000);
  }

  private parseJsonObject(text: string | undefined, context: string, providerName: string): any {
    const raw = (text || '').trim();
    if (!raw) {
      throw new LearningAIError(`Empty AI JSON response for ${context}`, providerName);
    }

    const unfenced = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const candidates = [unfenced];
    const firstBrace = unfenced.indexOf('{');
    const lastBrace = unfenced.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      candidates.push(unfenced.slice(firstBrace, lastBrace + 1));
    }

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch {
        // Try the next extraction shape before surfacing a parse error.
      }
    }

    throw new LearningAIError(`Failed to parse AI JSON response for ${context}`, providerName, raw.slice(0, 600));
  }

  async analyzeSkillGap(input: GapAnalysisInput): Promise<SkillGapReport> {
    const provider = await this.registry.getFor('learning-hub');
    const lang = input.lang || 'fr';

    const safeSkills = input.currentSkills.map((s) => ({
      skill: this.sanitizeText(s.skill),
      evidence: s.evidence ? this.sanitizeText(s.evidence) : undefined,
    }));

    const safeJDs = (input.jobDescriptions || []).map((jd) => this.sanitizeText(jd));
    const safeCompetencies = (input.competencies || []).map((item) => this.sanitizeText(item));

    const systemPrompt = `You are an expert career orientation AI for candidates from ANY industry or academic major. Analyze the skill gap between the candidate's profile and target role. Never assume the candidate works in technology. Use the candidate's field, experience, competencies, and context to create relevant skills for that specific path.
Respond ONLY with a valid JSON object matching this schema:
{
  "goalId": "${input.goalId}",
  "targetRole": "${this.sanitizeText(input.targetRole)}",
  "strengths": [{"skill": "string", "level": 1-5, "evidence": "string"}],
  "gaps": [{"skill": "string", "currentLevel": 0-5, "targetLevel": 1-5, "priority": "critical"|"high"|"nice", "demandCount": number, "rationale": "string"}],
  "summary": "string"
}`;

    const userPrompt = `Target Role: ${input.targetRole} (${input.seniority || 'mid'})
  Current Role: ${this.sanitizeText(input.currentRole || 'Not provided')}
  Field of Study / Major: ${this.sanitizeText(input.fieldOfStudy || 'Not provided')}
Candidate Current Skills: ${JSON.stringify(safeSkills)}
  Additional Competencies: ${JSON.stringify(safeCompetencies)}
  Candidate Context: ${this.sanitizeText(input.context || 'Not provided')}
Market Job Samples: ${safeJDs.length > 0 ? safeJDs.join('\n---\n') : 'Standard market expectations'}
Language: ${lang === 'fr' ? 'French' : 'English'}`;

    try {
      const response = await provider.complete({
        system: systemPrompt,
        prompt: userPrompt,
        responseMimeType: 'application/json',
      });

      const parsed = this.parseJsonObject(response.text, 'skill gap analysis', provider.name);

      parsed.goalId = input.goalId;
      parsed.targetRole = input.targetRole;
      parsed.generatedAt = new Date().toISOString();
      parsed.source = 'ai';
      parsed.promptVersion = LearningAIAdapter.PROMPT_VERSION;
      parsed.lang = lang;

      const validated = SkillGapReportSchema.safeParse(parsed);
      if (!validated.success) {
        throw new LearningAIError('La réponse IA sur les écarts de compétences est incomplète.', provider.name, validated.error);
      }

      return validated.data as SkillGapReport;
    } catch (error) {
      if (error instanceof LearningAIError) throw error;
      throw new LearningAIError(`Error during skill gap analysis: ${error instanceof Error ? error.message : String(error)}`, provider.name, error);
    }
  }

  async generateRoadmap(input: RoadmapInput): Promise<Roadmap> {
    const provider = await this.registry.getFor('learning-hub');
    const lang = input.lang || 'fr';

    const systemPrompt = `You are a Senior Learning Architect AI creating a personalized S-curve learning roadmap.
Return ONLY a valid JSON object matching this schema:
{
  "goalId": "${input.report.goalId}",
  "roleProfile": {
    "role": "${this.sanitizeText(input.report.targetRole)}",
    "missions": ["string"],
    "keySkills": ["string"],
    "prerequisites": ["string"],
    "imageHint": "string"
  },
  "milestones": [
    {
      "id": "m1",
      "order": 1,
      "title": "string",
      "skills": ["string"],
      "estHours": 12,
      "prerequisites": [],
      "resourceRefs": [
        {
          "provider": "coursera"|"udemy"|"youtube"|"freecodecamp"|"kaggle"|"leetcode"|"docs",
          "title": "string",
          "why": "string",
          "skill": "string"
        }
      ],
      "sourceTag": "coursera"|"udemy"|"youtube"|"freecodecamp"|"kaggle"|"leetcode"|"docs",
      "iconKey": "code"|"database"|"cloud"|"brain"|"layers"|"shield"
    }
  ],
  "estimatedWeeks": 8
}`;

    const userPrompt = `Target Role: ${input.report.targetRole}
  Candidate context from their profile: ${input.report.summary}
Identified Skill Gaps: ${JSON.stringify(input.report.gaps)}
User Capacity: ${input.hoursPerWeek} hours/week, Timeframe: ${input.timeframeMonths} months
Language: ${lang === 'fr' ? 'French' : 'English'}`;

    try {
      const response = await provider.complete({
        system: systemPrompt,
        prompt: userPrompt,
        responseMimeType: 'application/json',
      });

      const parsed = this.parseJsonObject(response.text, 'roadmap generation', provider.name);

      parsed.goalId = input.report.goalId;
      parsed.generatedAt = new Date().toISOString();
      parsed.promptVersion = LearningAIAdapter.PROMPT_VERSION;
      parsed.version = 1;
      parsed.lang = lang;

      if (Array.isArray(parsed.milestones)) {
        parsed.milestones = parsed.milestones.map((m: any) => ({
          ...m,
          resourceRefs: (m.resourceRefs || []).map((r: any) => ({
            ...r,
            searchUrl: buildSearchUrl(r.provider || 'youtube', r.title || m.title),
          })),
        }));

        // Cycle detection and topological sort
        parsed.milestones = SkillDependencyResolver.sortAndValidate(parsed.milestones);
      }

      const validated = RoadmapSchema.safeParse(parsed);
      if (!validated.success) {
        throw new LearningAIError('La feuille de route IA est incomplète.', provider.name, validated.error);
      }

      return validated.data as Roadmap;
    } catch (error) {
      if (error instanceof LearningAIError) throw error;
      throw new LearningAIError(`Error generating roadmap: ${error instanceof Error ? error.message : String(error)}`, provider.name, error);
    }
  }

  async recommendResources(skill: string, targetLevel: SkillLevel, lang: 'fr' | 'en' = 'fr'): Promise<ResourceRef[]> {
    const providers: any[] = ['coursera', 'udemy', 'youtube', 'freecodecamp', 'docs'];
    return providers.map((prov) => {
      const title = `${skill} Course & Documentation ${prov.toUpperCase()}`;
      return {
        provider: prov,
        title,
        why: `Formation ciblée pour atteindre le niveau ${targetLevel}/5 en ${skill}.`,
        searchUrl: buildSearchUrl(prov, skill),
        skill,
      };
    });
  }
}
