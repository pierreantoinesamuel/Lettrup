import { ILearningRepository } from '../ports/ILearningRepository';
import { SkillProgress } from '../domain/types';

export class UpdateProgressUseCase {
  constructor(private repo: ILearningRepository) {}

  async execute(userId: string, goalId: string, progress: SkillProgress): Promise<void> {
    await this.repo.upsertProgress(userId, goalId, progress);
  }
}
