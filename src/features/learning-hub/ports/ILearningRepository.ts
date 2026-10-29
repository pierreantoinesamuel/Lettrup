import {
  CareerGoal,
  SkillGapReport,
  Roadmap,
  WeeklyTask,
  SkillProgress,
  ResourceFeedback,
  LearningStats,
  LearningJob,
} from '../domain/types';

export interface SaveGoalInput {
  targetRole: string;
  currentRole?: string;
  fieldOfStudy?: string;
  competencies?: string[];
  context?: string;
  seniority?: 'junior' | 'mid' | 'senior' | 'lead';
  timeframeMonths: 3 | 6 | 12;
  hoursPerWeek: number;
  strategyId?: string;
  lang?: 'fr' | 'en';
}

export interface ILearningRepository {
  listGoals(userId: string): Promise<CareerGoal[]>;
  getActiveGoal(userId: string): Promise<CareerGoal | null>;
  saveGoal(userId: string, input: SaveGoalInput): Promise<CareerGoal>;
  setActiveGoal(userId: string, goalId: string): Promise<void>;
  deleteGoal?(userId: string, goalId: string): Promise<void>;

  getLatestReport(userId: string, goalId: string): Promise<SkillGapReport | null>;
  saveReport(userId: string, report: SkillGapReport): Promise<void>;

  getRoadmap(userId: string, goalId: string): Promise<Roadmap | null>;
  saveRoadmap(userId: string, roadmap: Roadmap): Promise<void>;

  listTasks(userId: string, goalId: string): Promise<WeeklyTask[]>;
  upsertTasks(userId: string, goalId: string, tasks: WeeklyTask[]): Promise<void>;
  setTaskStatus(userId: string, taskId: string, status: 'todo' | 'done'): Promise<void>;

  listProgress(userId: string, goalId: string): Promise<SkillProgress[]>;
  upsertProgress(userId: string, goalId: string, progress: SkillProgress): Promise<void>;

  saveResourceFeedback(userId: string, fb: ResourceFeedback): Promise<void>;
  getStats(userId: string): Promise<LearningStats>;

  // Async job management
  createJob(userId: string, goalId: string, kind: 'gap' | 'roadmap'): Promise<LearningJob>;
  getJob(jobId: string): Promise<LearningJob | null>;
  updateJob(jobId: string, updates: Partial<LearningJob>): Promise<void>;
}
