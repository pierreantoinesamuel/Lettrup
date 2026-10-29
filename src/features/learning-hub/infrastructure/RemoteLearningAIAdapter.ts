/**
 * Client-side ILearningAI implementation. The AI calls it makes (skill gap
 * analysis, roadmap generation) go through the authenticated server route
 * /api/ai/invoke instead of instantiating LearningAIAdapter directly in the
 * browser, which would bundle the OpenRouter/Gemini provider keys into the
 * client — see aiEngineApi.ts.
 */
import { ILearningAI, GapAnalysisInput, RoadmapInput } from '../ports/ILearningAI';
import { SkillGapReport, Roadmap, ResourceRef, SkillLevel } from '../domain/types';
import { LearningAIError } from '../domain/errors';
import { supabase } from '../../../lib/supabase';

export class RemoteLearningAIAdapter implements ILearningAI {
  private async invoke<T>(op: string, args: any[]): Promise<T> {
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;

    const res = await fetch('/api/ai/invoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ op, args }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.success) {
      const errMsg = data?.error || `Erreur serveur IA (${res.status}).`;
      throw new LearningAIError(errMsg, 'server', errMsg);
    }
    return data.result as T;
  }

  async analyzeSkillGap(input: GapAnalysisInput): Promise<SkillGapReport> {
    return this.invoke<SkillGapReport>('learningHub.analyzeSkillGap', [input]);
  }

  async generateRoadmap(input: RoadmapInput): Promise<Roadmap> {
    return this.invoke<Roadmap>('learningHub.generateRoadmap', [input]);
  }

  // Pure lookup logic, no AI call involved — safe to keep client-side.
  async recommendResources(skill: string, targetLevel: SkillLevel, lang: 'fr' | 'en' = 'fr'): Promise<ResourceRef[]> {
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    const response = await fetch('/api/learning/resources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ skill, targetLevel, lang }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data || !data.success || !Array.isArray(data.resources)) {
      throw new LearningAIError(data?.error || 'Impossible de charger les ressources.', 'youtube');
    }
    return data.resources as ResourceRef[];
  }
}
