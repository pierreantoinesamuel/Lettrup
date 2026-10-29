import { ILearningRepository } from '../ports/ILearningRepository';
import { ILearningAI, RoadmapInput } from '../ports/ILearningAI';
import { Roadmap } from '../domain/types';
import { deriveWeeklyPlan } from '../domain/services/deriveWeeklyPlan';

export class GenerateRoadmapUseCase {
  constructor(private repo: ILearningRepository, private ai: ILearningAI) {}

  async execute(userId: string, input: RoadmapInput, forceRegenerate = false): Promise<Roadmap> {
    const existing = await this.repo.getRoadmap(userId, input.report.goalId);
    if (existing && !forceRegenerate) {
      return existing;
    }

    const roadmap = await this.ai.generateRoadmap(input);
    await this.repo.saveRoadmap(userId, roadmap);

    // Derive initial weekly plan tasks from roadmap
    const tasks = deriveWeeklyPlan(roadmap, input.hoursPerWeek);
    await this.repo.upsertTasks(userId, input.report.goalId, tasks);

    return roadmap;
  }
}
