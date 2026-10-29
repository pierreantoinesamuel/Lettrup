import { ILearningRepository } from '../ports/ILearningRepository';
import { CareerGoal, SkillGapReport, Roadmap, WeeklyTask, SkillProgress, LearningStats } from '../domain/types';

export interface LearningDashboardData {
  goals: CareerGoal[];
  activeGoal: CareerGoal | null;
  report: SkillGapReport | null;
  roadmap: Roadmap | null;
  tasks: WeeklyTask[];
  progress: SkillProgress[];
  stats: LearningStats;
}

export class GetDashboardUseCase {
  constructor(private repo: ILearningRepository) {}

  async execute(userId: string): Promise<LearningDashboardData> {
    const goals = await this.repo.listGoals(userId);
    const activeGoal = await this.repo.getActiveGoal(userId);
    const stats = await this.repo.getStats(userId);

    if (!activeGoal) {
      return {
        goals,
        activeGoal: null,
        report: null,
        roadmap: null,
        tasks: [],
        progress: [],
        stats,
      };
    }

    const [report, roadmap, tasks, progress] = await Promise.all([
      this.repo.getLatestReport(userId, activeGoal.id),
      this.repo.getRoadmap(userId, activeGoal.id),
      this.repo.listTasks(userId, activeGoal.id),
      this.repo.listProgress(userId, activeGoal.id),
    ]);

    return {
      goals,
      activeGoal,
      report,
      roadmap,
      tasks,
      progress,
      stats,
    };
  }
}
