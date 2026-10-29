/**
 * Unit Tests for Feature 2: ATS Scanner & Optimization Engine Domain Logic
 */

import { calculateOverallAtsScore } from './AtsScore';
import { createAtsScanReport } from './AtsScanReport';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
}

export function runAtsScanDomainTests(): { passed: boolean; testCount: number } {
  let testCount = 0;

  // Test 1: Weighted score calculation
  {
    testCount++;
    // 80*0.45 (36) + 60*0.25 (15) + 100*0.15 (15) + 80*0.15 (12) = 78
    const score = calculateOverallAtsScore(80, 60, 100, 80);
    assert(score === 78, `Expected overall score 78, got ${score}`);
  }

  // Test 2: Bound enforcement (0 - 100)
  {
    testCount++;
    const maxScore = calculateOverallAtsScore(120, 150, 110, 100);
    assert(maxScore <= 100, `Expected score capped at 100, got ${maxScore}`);

    const minScore = calculateOverallAtsScore(-20, -50, 0, 0);
    assert(minScore >= 0, `Expected score floor at 0, got ${minScore}`);
  }

  // Test 3: createAtsScanReport entity construction
  {
    testCount++;
    const report = createAtsScanReport({
      id: 'scan-123',
      cvId: 'cv-456',
      jobOfferTitle: 'Développeur Lead Frontend',
      keywordScore: 90,
      impactScore: 70,
      formattingScore: 95,
      readabilityScore: 85,
      matchSummary: 'Excellente adéquation technique.',
      keywords: [
        { keyword: 'React', category: 'hard_skill', foundInCv: true, frequencyInJobOffer: 4 },
        { keyword: 'Docker', category: 'tool', foundInCv: false, frequencyInJobOffer: 2 },
      ],
      riskFlags: [
        {
          id: 'risk-1',
          category: 'keyword',
          severity: 'warning',
          message: 'Mot-clé Docker absent',
          recommendation: 'Ajouter des détails sur les conteneurs',
        },
      ],
      recommendedBulletPoints: ['Conception de micro-frontends en React et TypeScript'],
    });

    assert(report.id === 'scan-123', 'Report ID mismatch');
    assert(report.scores.overallScore === 85, `Expected overall score 85, got ${report.scores.overallScore}`);
    assert(report.keywords.length === 2, 'Keywords count mismatch');
    assert(report.riskFlags.length === 1, 'Risk flags count mismatch');
  }

  return { passed: true, testCount };
}
