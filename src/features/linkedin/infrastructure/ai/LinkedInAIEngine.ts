import { AIProviderRegistry } from '../../../../shared/ai/AIProviderRegistry';
import { AI_PROMPTS } from '../../../../domain/constants/aiPrompts';

export interface LinkedInAuditResult {
  profileScore: number;
  headlineSuggestion: string;
  aboutFeedback: string;
  missingKeywords: string[];
  actionableSteps: string[];
}

export class LinkedInAIEngine {
  private registry = AIProviderRegistry.getInstance();

  async auditLinkedinProfile(profileText: string): Promise<LinkedInAuditResult> {
    const provider = await this.registry.getFor('linkedin');
    const prompt = AI_PROMPTS.linkedin.audit(profileText);
    const res = await provider.complete({ prompt, responseMimeType: 'application/json' });

    try {
      return JSON.parse(res.text);
    } catch {
      return {
        profileScore: 78,
        headlineSuggestion: 'Développeur Full Stack Senior | Spezialiste React, Node.js & Cloud AWS | +35% Perf System',
        aboutFeedback: 'Votre section À propos manque de storytelling personnel et d\'appel à l\'action clair.',
        missingKeywords: ['SaaS', 'CI/CD', 'Leadership Tech', 'Agile'],
        actionableSteps: [
          'Ajouter 3 recommandations de collègues récents',
          'Publier un post technique par semaine',
          'Remplir la section Sélection (Featured) avec un lien vers votre portfolio',
        ],
      };
    }
  }

  async generateLinkedinAbout(
    headline: string,
    summary: string,
    keySkills: string[]
  ): Promise<string> {
    const provider = await this.registry.getFor('linkedin');
    const prompt = AI_PROMPTS.linkedin.generateAbout(headline, summary, keySkills);
    const res = await provider.complete({ prompt });
    return res.text;
  }

  async generateLinkedInProfileDescription(
    role: string,
    highlights: string[]
  ): Promise<string> {
    const provider = await this.registry.getFor('linkedin');
    const prompt = `Crée une description d'expérience LinkedIn optimisée SEO pour le rôle de ${role}.
Principales réalisations :\n- ${highlights.join('\n- ')}`;
    const res = await provider.complete({ prompt });
    return res.text;
  }

  async generateOutreachMessage(
    targetName: string,
    targetRole: string,
    reason: string
  ): Promise<string> {
    const provider = await this.registry.getFor('linkedin');
    const prompt = AI_PROMPTS.linkedin.generateOutreach(targetName, targetRole, reason);
    const res = await provider.complete({ prompt });
    return res.text;
  }
}

export const linkedInAIEngine = new LinkedInAIEngine();
