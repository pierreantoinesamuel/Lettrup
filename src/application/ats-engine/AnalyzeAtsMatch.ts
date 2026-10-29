/**
 * Application Use Case: AnalyzeAtsMatch
 * Orchestrates ATS job match analysis:
 * 1. Formats candidate CV and job offer text
 * 2. Queries AI provider (ats-engine)
 * 3. Computes domain AtsScanReport entity with weighted score breakdown
 * 4. Generates actionable keyword gap analysis and risk flags
 */

import { createAtsScanReport, AtsScanReport, KeywordMatchItem } from '../../domain/ats-engine/AtsScanReport';
import { AtsRiskFlag } from '../../domain/ats-engine/AtsScore';
import { AIProviderRegistry } from '../../shared/ai/AIProviderRegistry';
import { SavedResume } from '../../types';
import { EntitlementService } from '../billing/EntitlementGate';
import { TrialLifecycleRepository } from '../../infrastructure/repositories/TrialLifecycleRepository';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

export interface AnalyzeAtsInput {
  cvId: string;
  jobOfferText: string;
  jobOfferTitle?: string;
  resumeText?: string;
}

const atsAiResponseSchema = z.object({
  keywordScore: z.number().min(0).max(100),
  impactScore: z.number().min(0).max(100),
  formattingScore: z.number().min(0).max(100),
  readabilityScore: z.number().min(0).max(100),
  matchSummary: z.string().trim().min(1),
  keywords: z.array(z.object({
    keyword: z.string().trim().min(1),
    category: z.enum(['hard_skill', 'soft_skill', 'tool', 'certification', 'domain']),
    foundInCv: z.boolean(),
    frequencyInJobOffer: z.number().min(0),
  })).default([]),
  riskFlags: z.array(z.object({
    id: z.string().optional(),
    category: z.enum(['keyword', 'formatting', 'impact', 'structure']),
    severity: z.enum(['critical', 'warning', 'info']),
    message: z.string().trim().min(1),
    recommendation: z.string().default(''),
  })).default([]),
  recommendedBulletPoints: z.array(z.string().trim().min(1)).default([]),
});

export function parseAtsAnalysisResponse(responseText: string) {
  const cleanText = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleanText);
  } catch {
    throw new Error('L’analyse ATS n’a pas renvoyé un résultat valide.');
  }

  const parsed = atsAiResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error('L’analyse ATS n’a pas renvoyé un résultat complet.');
  }

  return {
    ...parsed.data,
    riskFlags: parsed.data.riskFlags.map((flag, index) => ({
      ...flag,
      id: flag.id || `risk-${index + 1}`,
    })),
  };
}

export class AnalyzeAtsMatchUseCase {
  private aiRegistry = AIProviderRegistry.getInstance();
  private entitlementService = new EntitlementService(new TrialLifecycleRepository());

  async execute(
    input: AnalyzeAtsInput,
    cvData: SavedResume,
    callerId: string,
    saveScanFn?: (report: AtsScanReport) => Promise<void>
  ): Promise<AtsScanReport> {
    const entitlement = await this.entitlementService.checkEntitlement(callerId);
    if (!entitlement.allowed) {
      throw new Error(
        entitlement.reason === 'payment_required'
          ? 'Votre période d\'essai est terminée. Veuillez souscrire à un abonnement pour effectuer un scan ATS.'
          : 'Votre compte est bloqué ou suspendu.'
      );
    }

    const provider = await this.aiRegistry.getFor('ats-engine');

    const skills = Array.isArray(cvData.data.skills) ? cvData.data.skills : [];
    const experience = Array.isArray(cvData.data.experience) ? cvData.data.experience : [];
    const cvText = input.resumeText?.trim() || `
  Candidat: ${cvData.data.fullName || ''}
  Titre: ${cvData.jobTitle || ''}
  Résumé: ${cvData.data.summary || ''}
  Compétences: ${skills.join(', ')}
  Expériences: ${experience.map((item) => `${item.role} chez ${item.company}: ${item.description}`).join(' | ')}
  `;

    const systemPrompt = `You are a world-class Applicant Tracking System (ATS) Parser and Career Coach.
Analyze the candidate CV against the job description with high accuracy.
Output a strict JSON object matching this schema:
{
  "keywordScore": number (0-100),
  "impactScore": number (0-100),
  "formattingScore": number (0-100),
  "readabilityScore": number (0-100),
  "matchSummary": "string",
  "keywords": [
    { "keyword": "string", "category": "hard_skill" | "soft_skill" | "tool" | "certification" | "domain", "foundInCv": boolean, "frequencyInJobOffer": number }
  ],
  "riskFlags": [
    { "id": "string", "category": "keyword" | "formatting" | "impact" | "structure", "severity": "critical" | "warning" | "info", "message": "string", "recommendation": "string" }
  ],
  "recommendedBulletPoints": ["string"]
}`;

    const userPrompt = `
OFFRE D'EMPLOI :
${input.jobOfferText}

CV DU CANDIDAT :
${cvText}
`;

    const response = await provider.complete({
      prompt: `${systemPrompt}\n\n${userPrompt}`,
      responseMimeType: 'application/json',
    });

    const rawParsed = parseAtsAnalysisResponse(response.text);

    const report = createAtsScanReport({
      id: randomUUID(),
      cvId: cvData.id,
      jobOfferTitle: input.jobOfferTitle || 'Poste Cible',
      keywordScore: rawParsed.keywordScore,
      impactScore: rawParsed.impactScore,
      formattingScore: rawParsed.formattingScore,
      readabilityScore: rawParsed.readabilityScore,
      matchSummary: rawParsed.matchSummary,
      keywords: rawParsed.keywords,
      riskFlags: rawParsed.riskFlags,
      recommendedBulletPoints: rawParsed.recommendedBulletPoints,
    });

    if (saveScanFn) {
      await saveScanFn(report);
    }

    return report;
  }
}
