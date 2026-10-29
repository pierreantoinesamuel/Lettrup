import { SkillGapReport, Roadmap, ResourceRef, SkillLevel } from '../domain/types';

export interface GapAnalysisInput {
  goalId: string;
  targetRole: string;
  seniority?: string;
  currentSkills: { skill: string; evidence?: string }[];
  currentRole?: string;
  fieldOfStudy?: string;
  competencies?: string[];
  context?: string;
  atsScore?: number;
  jobDescriptions?: string[];
  lang?: 'fr' | 'en';
}

export interface RoadmapInput {
  report: SkillGapReport;
  hoursPerWeek: number;
  timeframeMonths: 3 | 6 | 12;
  lang?: 'fr' | 'en';
}

export interface ILearningAI {
  analyzeSkillGap(input: GapAnalysisInput): Promise<SkillGapReport>;
  generateRoadmap(input: RoadmapInput): Promise<Roadmap>;
  recommendResources(skill: string, targetLevel: SkillLevel, lang?: 'fr' | 'en'): Promise<ResourceRef[]>;
}
