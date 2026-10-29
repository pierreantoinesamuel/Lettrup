import { ILearningRepository } from '../ports/ILearningRepository';
import { WeeklyTask } from '../domain/types';
import { deriveWeeklyPlan } from '../domain/services/deriveWeeklyPlan';

export class DeriveWeeklyPlanUseCase {
  constructor(private repo: ILearningRepository) {}

  async execute(userId: string, goalId: string, hoursPerWeek: number): Promise<WeeklyTask[]> {
    const roadmap = await this.repo.getRoadmap(userId, goalId);
    if (!roadmap) return [];

    const tasks = deriveWeeklyPlan(roadmap, hoursPerWeek);
    await this.repo.upsertTasks(userId, goalId, tasks);
    return tasks;
  }
}
