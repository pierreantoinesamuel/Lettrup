export type SkillLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type GapPriority = 'critical' | 'high' | 'nice';
export type SkillState = 'identified' | 'learning' | 'practiced' | 'validated';
export type StepState = 'locked' | 'new' | 'in_progress' | 'completed';

export type ResourceProvider =
  | 'coursera'
  | 'udemy'
  | 'edx'
  | 'freecodecamp'
  | 'youtube'
  | 'vimeo'
  | 'kaggle'
  | 'leetcode'
  | 'hackerrank'
  | 'exercism'
  | 'docs'
  | 'internal';

export type LearningActivityKind =
  | 'video'
  | 'project'
  | 'quiz'
  | 'reading'
  | 'certification'
  | 'coding'
  | 'cv-task'
  | 'linkedin-task'
  | 'mock-interview'
  | 'networking';

export interface LearningActivity {
  id: string;
  kind: LearningActivityKind;
  title: string;
  description?: string;
  url?: string;
  estMinutes?: number;
  completed?: boolean;
}

export interface RoleProfile {
  role: string;
  missions: string[];
  keySkills: string[];
  prerequisites: string[];
  imageHint?: string;
}

export interface CareerGoal {
  id: string;
  userId: string;
  targetRole: string;
  currentRole?: string;
  fieldOfStudy?: string;
  competencies?: string[];
  context?: string;
  seniority?: 'junior' | 'mid' | 'senior' | 'lead';
  timeframeMonths: 3 | 6 | 12;
  hoursPerWeek: number;
  strategyId?: string;
  isActive: boolean;
  createdAt: string;
  lang: 'fr' | 'en';
}

export interface SkillGap {
  skill: string;
  currentLevel: SkillLevel;
  targetLevel: SkillLevel;
  priority: GapPriority;
  demandCount: number;
  rationale: string;
}

export interface SkillSignal {
  skill: string;
  level: SkillLevel;
  evidence?: string;
}

export interface SkillGapReport {
  goalId: string;
  targetRole: string;
  strengths: SkillSignal[];
  gaps: SkillGap[];
  summary: string;
  generatedAt: string;
  source: 'ai' | 'reused-strategy';
  promptVersion: number;
  lang: 'fr' | 'en';
}

export interface ResourceRef {
  provider: ResourceProvider;
  title: string;
  why: string;
  searchUrl: string;
  skill: string;
  channelName?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
}

export interface Milestone {
  id: string;
  order: number;
  title: string;
  skills: string[];
  estHours: number;
  prerequisites: string[];
  resourceRefs: ResourceRef[];
  sourceTag: ResourceProvider | 'registration';
  iconKey?: string;
  activities?: LearningActivity[];
}

export interface Roadmap {
  goalId: string;
  roleProfile: RoleProfile;
  milestones: Milestone[];
  estimatedWeeks: number;
  generatedAt: string;
  promptVersion: number;
  version: number;
  lang: 'fr' | 'en';
}

export interface RoadmapStep {
  milestoneId: string;
  order: number;
  title: string;
  state: StepState;
  sourceTag: ResourceProvider | 'registration';
  iconKey?: string;
  skills: string[];
  estHours: number;
  activitiesCount: number;
}

export interface WeeklyTask {
  id: string;
  goalId: string;
  weekNumber: number;
  skill: string;
  description: string;
  resourceRef?: ResourceRef;
  status: 'todo' | 'done';
}

export interface SkillProgress {
  skill: string;
  state: SkillState;
  hoursLogged: number;
  validatedAt?: string;
}

export interface ResourceFeedback {
  userId: string;
  skill: string;
  provider: ResourceProvider;
  title: string;
  rating: 'up' | 'down';
  timestamp: string;
}

export interface LearningJob {
  id: string;
  userId: string;
  goalId: string;
  kind: 'gap' | 'roadmap';
  status: 'queued' | 'running' | 'done' | 'failed';
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningStats {
  activeGoalRole: string;
  readiness: number;
  skillsValidated: number;
  skillsTotal: number;
  currentStreakDays: number;
  xp: number;
  level: number;
  badgeCount: number;
}
