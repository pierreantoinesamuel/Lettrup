import { SkillGap, SkillProgress } from '../types';

export function computeReadiness(args: {
  gaps: SkillGap[];
  progress: SkillProgress[];
  atsScore?: number;
}): number {
  const { gaps, progress, atsScore = 65 } = args;

  if (gaps.length === 0) return Math.min(100, Math.max(0, atsScore));

  const validatedCount = progress.filter((p) => p.state === 'validated').length;
  const practicedCount = progress.filter((p) => p.state === 'practiced').length;
  const learningCount = progress.filter((p) => p.state === 'learning').length;

  const gapClosureRatio = (validatedCount * 1.0 + practicedCount * 0.6 + learningCount * 0.2) / gaps.length;
  const gapClosureScore = Math.min(100, Math.round(gapClosureRatio * 100));

  // Weighted blend: 60% Gap closure, 40% ATS Base Score
  const totalReadiness = Math.round(gapClosureScore * 0.6 + atsScore * 0.4);
  return Math.min(100, Math.max(0, totalReadiness));
}
