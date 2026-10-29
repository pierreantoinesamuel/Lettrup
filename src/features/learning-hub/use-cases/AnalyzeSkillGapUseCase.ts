import { ILearningRepository } from '../ports/ILearningRepository';
import { ILearningAI, GapAnalysisInput } from '../ports/ILearningAI';
import { SkillGapReport } from '../domain/types';

export class AnalyzeSkillGapUseCase {
  constructor(private repo: ILearningRepository, private ai: ILearningAI) {}

  async execute(userId: string, input: GapAnalysisInput, forceRegenerate = false): Promise<SkillGapReport> {
    // Check if report exists and is fresh (< 14 days)
    const existing = await this.repo.getLatestReport(userId, input.goalId);
    if (existing && !forceRegenerate) {
      const generatedAt = new Date(existing.generatedAt).getTime();
      const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
      if (Date.now() - generatedAt < fourteenDaysMs) {
        return existing;
      }
    }

    const report = await this.ai.analyzeSkillGap(input);
    await this.repo.saveReport(userId, report);
    return report;
  }
}
