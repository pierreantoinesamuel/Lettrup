import { AIProviderRegistry } from '../../../../shared/ai/AIProviderRegistry';
import { IAIProvider } from '../../../../shared/ai/IAIProvider';
import { AIRequest, AIResponse } from '../../../../shared/ai/types';
import { parseGeneratedBullets, parseGeneratedResumeSection, ResumeAIEngine } from './ResumeAIEngine';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[TEST FAILED] ${message}`);
}

function createProvider(response: (request: AIRequest) => string): IAIProvider {
  return {
    name: 'openrouter',
    model: 'test-model',
    async complete(request: AIRequest): Promise<AIResponse> {
      return { text: response(request), model: 'test-model', provider: 'openrouter' };
    },
    async *stream() {},
    async isAvailable() { return true; },
  };
}

export async function runResumeAIEngineTests() {
  let testCount = 0;

  testCount++;
  {
    const engine = new ResumeAIEngine(new AIProviderRegistry([
      createProvider((request) => {
        assert(request.prompt.includes('exclusivement les informations explicitement présentes'), 'Section prompt must prohibit invented CV facts');
        return JSON.stringify({
          title: 'Certifications',
          items: ['Certification Scrum Master', 'Certification Scrum Master', 'Formation sécurité'],
        });
      }),
    ]));
    const generated = await engine.generateResumeSection('Crée une rubrique Certifications', 'Certification Scrum Master\nFormation sécurité');
    assert(generated.title === 'Certifications', 'Generated section title should be returned');
    assert(generated.items.length === 2, 'Generated section entries should be deduplicated');
  }

  testCount++;
  {
    const emptyResult = parseGeneratedResumeSection(JSON.stringify({ title: 'Certifications', items: [] }));
    assert(emptyResult.items.length === 0, 'Empty section response should remain empty rather than invent content');
    let rejectedInvalid = false;
    try {
      parseGeneratedResumeSection('not JSON');
    } catch {
      rejectedInvalid = true;
    }
    assert(rejectedInvalid, 'Malformed generated-section output should be rejected');
  }

  testCount++;
  {
    const fencedBullets = parseGeneratedBullets('```json\n["Puce 1", "Puce 2", "Puce 3"]\n```');
    assert(fencedBullets.length === 3 && fencedBullets[0] === 'Puce 1', 'Fenced JSON array bullets should be parsed cleanly');

    const objectBullets = parseGeneratedBullets(JSON.stringify({ bullets: ['Action A', 'Action B'] }));
    assert(objectBullets.length === 2 && objectBullets[1] === 'Action B', 'Object-wrapped JSON bullets should be unwrapped');
  }

  testCount++;
  {
    const engine = new ResumeAIEngine(new AIProviderRegistry([
      createProvider(() => JSON.stringify({ title: 'Certifications', items: [] })),
    ]));
    const generated = await engine.generateResumeSection(
      'Crée une rubrique Certifications à partir de mon CV',
      'Candidat : Dwight\nPermis : Permis B\nFormations :\nBA Business Administration - Scranton University (1994 - 1998)\nCompétences : Karaté (Ceinture Violette)'
    );
    assert(generated.title === 'Certifications', 'Fallback section should retain requested title');
    assert(generated.items.length > 0, 'Fallback section should derive items from CV facts when AI returns empty items');
  }

  testCount++;
  {
    const sourceText = [
      'Amira Martin',
      'Expérience professionnelle',
      'Développeuse chez Alpha - 2022 à 2025',
      '• Création d’une application utilisée par 500 clients',
      'Formation',
      'Master informatique - Université de Lyon - 2022',
      'Compétences',
      'TypeScript, React, SQL',
      'Autres informations '.repeat(50),
    ].join('\n');
    const engine = new ResumeAIEngine(new AIProviderRegistry([
      createProvider(() => JSON.stringify({ fullName: 'Amira Martin', summary: sourceText, skills: 'TypeScript\nReact' })),
    ]));
    const parsed = await engine.parseResumeWithAI(sourceText);
    assert(parsed.experience.length > 0, 'Source experience should be recovered when AI omits it');
    assert(parsed.experience[0].role === 'Développeuse', 'Role should be parsed from source experience when AI omits it');
    assert(parsed.experience[0].company === 'Alpha', 'Company should be parsed from source experience when AI omits it');
    assert(parsed.education.length > 0, 'Source education should be recovered when AI omits it');
    assert(parsed.education[0].institution === 'Université de Lyon', 'Education institution should be parsed from source');
    assert(parsed.skills.includes('TypeScript'), 'String-shaped skills should be normalized');
    assert(parsed.summary === '', 'A whole CV with recognizable sections should not be stuffed into the profile field');
  }

  testCount++;
  {
    const engine = new ResumeAIEngine(new AIProviderRegistry([
      createProvider(() => 'not valid JSON'),
    ]));
    let rejected = false;
    try {
      await engine.auditResume('Amira Martin\nDéveloppeuse\nExpérience professionnelle');
    } catch {
      rejected = true;
    }
    assert(rejected, 'Invalid ATS output must not be turned into a fabricated successful score');
  }

  testCount++;
  {
    const multiLineCv = [
      'PIERRE SAMUEL AN',
      'ANALYSTE BI / BUSINESS ANALYST',
      'Paris, Île-de-France | +33 7 82 54 32 76 | pierre@example.com',
      'EXPÉRIENCES PROFESSIONNELLES',
      'Chef de Projet Digital / Analyste Fonctionnel (Stage)',
      'Ministère des Armées — Paris | Mai 2025 – Septembre 2025',
      '• Recueil des besoins métiers et rédaction des spécifications fonctionnelles.',
      'COMPÉTENCES TECHNIQUES',
      'Business Intelligence & Visualisation : Power BI (DAX, Power Query), Tableau',
      'FORMATION',
      'MBA Management & Data Science',
      'PPA Business School — Paris | 2024 – 2026',
      'CERTIFICATIONS & FORMATIONS COMPLÉMENTAIRES',
      '• Certification Power BI Data Analyst Associate',
      '• Professional Scrum Master I (PSM I)',
    ].join('\n');
    const engine = new ResumeAIEngine(new AIProviderRegistry([
      createProvider(() => { throw new Error('Provider offline'); }),
    ]));
    const parsed = await engine.parseResumeWithAI(multiLineCv);
    assert(parsed.jobTitle === 'ANALYSTE BI / BUSINESS ANALYST', 'Job title should be parsed from header');
    assert(parsed.location === 'Paris, Île-de-France', 'Location should be parsed from header');
    assert(parsed.experience.length === 1, 'Two-line experience header should produce a single experience entry');
    assert(parsed.experience[0].company === 'Ministère des Armées', 'Company should be parsed from second header line');
    assert(parsed.experience[0].duration === 'Mai 2025 – Septembre 2025', 'Duration should be parsed from second header line');
    assert(parsed.skills.some((s) => s.includes('Power BI (DAX, Power Query)')), 'Skills with commas inside parentheses must not be split');
    assert(parsed.education.length === 1, 'Two-line education header should produce a single education entry');
    assert(parsed.education[0].degree === 'MBA Management & Data Science', 'Degree should be parsed from first education line');
    assert(parsed.education[0].institution.includes('PPA Business School'), 'Institution should be parsed from second education line');
    assert(Array.isArray(parsed.certifications) && parsed.certifications.length === 2, 'Certifications section should be extracted from CV');
  }

  return { testCount };
}
