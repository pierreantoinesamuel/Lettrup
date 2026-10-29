/**
 * Domain Entity: AtsScanReport
 * Represents a complete ATS scan analysis for a candidate's CV against a target job offer.
 */

import { AtsScoreBreakdown, AtsRiskFlag, calculateOverallAtsScore } from './AtsScore';

export interface KeywordMatchItem {
  keyword: string;
  category: 'hard_skill' | 'soft_skill' | 'tool' | 'certification' | 'domain';
  foundInCv: boolean;
  frequencyInJobOffer: number;
}

export interface AtsScanReport {
  id: string;
  cvId: string;
  jobOfferTitle: string;
  scannedAt: string;
  scores: AtsScoreBreakdown;
  matchSummary: string;
  keywords: KeywordMatchItem[];
  riskFlags: AtsRiskFlag[];
  recommendedBulletPoints: string[];
}

/**
 * Pure domain function to create a validated AtsScanReport entity.
 */
export function createAtsScanReport(params: {
  id: string;
  cvId: string;
  jobOfferTitle: string;
  keywordScore: number;
  impactScore: number;
  formattingScore: number;
  readabilityScore: number;
  matchSummary: string;
  keywords: KeywordMatchItem[];
  riskFlags: AtsRiskFlag[];
  recommendedBulletPoints: string[];
}): AtsScanReport {
  const overallScore = calculateOverallAtsScore(
    params.keywordScore,
    params.impactScore,
    params.formattingScore,
    params.readabilityScore
  );

  return {
    id: params.id,
    cvId: params.cvId,
    jobOfferTitle: params.jobOfferTitle || 'Offre d\'emploi ciblée',
    scannedAt: new Date().toISOString(),
    scores: {
      overallScore,
      keywordMatchScore: Math.min(100, Math.max(0, params.keywordScore)),
      formattingScore: Math.min(100, Math.max(0, params.formattingScore)),
      impactQuantificationScore: Math.min(100, Math.max(0, params.impactScore)),
      readabilityScore: Math.min(100, Math.max(0, params.readabilityScore)),
    },
    matchSummary: params.matchSummary,
    keywords: params.keywords,
    riskFlags: params.riskFlags,
    recommendedBulletPoints: params.recommendedBulletPoints,
  };
}
