/**
 * Domain Value Object: MatchGap
 * Identifies keywords/requirements from a job offer that are missing or partially matched in the CV.
 */

export interface MatchGap {
  keyword: string;
  category: 'technical' | 'soft' | 'tool' | 'certification' | 'experience';
  importance: 'critical' | 'preferred' | 'optional';
  status: 'missing' | 'partially_matched' | 'fully_matched';
}

/**
 * Pure domain function to compute match gaps between job requirements and CV content.
 */
export function computeMatchGaps(
  jobRequirements: string[],
  cvSkills: string[],
  cvExperienceText: string
): MatchGap[] {
  const normalizedCvText = `${cvSkills.join(' ')} ${cvExperienceText}`.toLowerCase();

  return jobRequirements.map((req) => {
    const normalizedReq = req.toLowerCase().trim();
    const isMatched = normalizedCvText.includes(normalizedReq);

    return {
      keyword: req,
      category: 'technical',
      importance: 'critical',
      status: isMatched ? 'fully_matched' : 'missing',
    };
  });
}
