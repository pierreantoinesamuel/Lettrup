import { z } from 'zod';

export const SkillLevelSchema = z.number().int().min(0).max(5);

export const SkillGapSchema = z.object({
  skill: z.string().min(1),
  currentLevel: SkillLevelSchema,
  targetLevel: SkillLevelSchema,
  priority: z.enum(['critical', 'high', 'nice']),
  demandCount: z.number().int().min(0).default(0),
  rationale: z.string().min(1),
});

export const RoleProfileSchema = z.object({
  role: z.string().min(1),
  missions: z.array(z.string()).min(1),
  keySkills: z.array(z.string()).min(1),
  prerequisites: z.array(z.string()).default([]),
  imageHint: z.string().optional(),
});

export const SkillGapReportSchema = z.object({
  goalId: z.string(),
  targetRole: z.string(),
  strengths: z.array(
    z.object({
      skill: z.string(),
      level: SkillLevelSchema,
      evidence: z.string().optional(),
    })
  ).default([]),
  gaps: z.array(SkillGapSchema),
  summary: z.string(),
  generatedAt: z.string().optional(),
  source: z.enum(['ai', 'reused-strategy']).default('ai'),
  promptVersion: z.number().default(1),
  lang: z.enum(['fr', 'en']).default('fr'),
});

export const ResourceRefSchema = z.object({
  provider: z.enum([
    'coursera',
    'udemy',
    'edx',
    'freecodecamp',
    'youtube',
    'vimeo',
    'kaggle',
    'leetcode',
    'hackerrank',
    'exercism',
    'docs',
    'internal',
  ]),
  title: z.string().min(1),
  why: z.string().min(1),
  skill: z.string().min(1),
});

export const LearningActivitySchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  kind: z.enum([
    'video',
    'project',
    'quiz',
    'reading',
    'certification',
    'coding',
    'cv-task',
    'linkedin-task',
    'mock-interview',
    'networking',
  ]),
  title: z.string().min(1),
  description: z.string().optional(),
  url: z.string().optional(),
  estMinutes: z.number().optional(),
  completed: z.boolean().default(false),
});

export const MilestoneSchema = z.object({
  id: z.string(),
  order: z.number().int().min(1),
  title: z.string().min(1),
  skills: z.array(z.string()).min(1),
  estHours: z.number().min(0).default(10),
  prerequisites: z.array(z.string()).default([]),
  resourceRefs: z.array(ResourceRefSchema).default([]),
  sourceTag: z.enum([
    'coursera',
    'udemy',
    'edx',
    'freecodecamp',
    'youtube',
    'vimeo',
    'kaggle',
    'leetcode',
    'hackerrank',
    'exercism',
    'docs',
    'internal',
    'registration',
  ]).default('youtube'),
  iconKey: z.string().optional(),
  activities: z.array(LearningActivitySchema).optional(),
});

export const RoadmapSchema = z.object({
  goalId: z.string(),
  roleProfile: RoleProfileSchema,
  milestones: z.array(MilestoneSchema).min(1),
  estimatedWeeks: z.number().int().min(1).default(8),
  generatedAt: z.string().optional(),
  promptVersion: z.number().default(1),
  version: z.number().default(1),
  lang: z.enum(['fr', 'en']).default('fr'),
});
