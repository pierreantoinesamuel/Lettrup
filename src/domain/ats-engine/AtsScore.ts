/**
 * Domain Value Object: AtsScore
 * Structured breakdown of ATS compliance and job match quality.
 */

export interface AtsScoreBreakdown {
  overallScore: number; // 0 - 100
  keywordMatchScore: number; // 0 - 100
  formattingScore: number; // 0 - 100
  impactQuantificationScore: number; // 0 - 100
  readabilityScore: number; // 0 - 100
}

export type AtsRiskSeverity = 'critical' | 'warning' | 'info';

export interface AtsRiskFlag {
  id: string;
  category: 'keyword' | 'formatting' | 'impact' | 'structure';
  severity: AtsRiskSeverity;
  message: string;
  recommendation: string;
}

/**
 * Pure domain function to compute overall ATS score from component scores.
 * Weighted formula:
 * - Keyword Match: 45%
 * - Impact Quantification: 25%
 * - Formatting & Parsability: 15%
 * - Readability & Tone: 15%
 */
export function calculateOverallAtsScore(
  keywordScore: number,
  impactScore: number,
  formattingScore: number,
  readabilityScore: number
): number {
  const weighted =
    keywordScore * 0.45 +
    impactScore * 0.25 +
    formattingScore * 0.15 +
    readabilityScore * 0.15;

  return Math.min(100, Math.max(0, Math.round(weighted)));
}
