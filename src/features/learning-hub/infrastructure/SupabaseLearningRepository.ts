import { supabase } from '../../../lib/supabase';
import { ILearningRepository, SaveGoalInput } from '../ports/ILearningRepository';
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
import { computeReadiness } from '../domain/services/computeReadiness';
import { XPCalculator } from '../domain/services/XPCalculator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function isMissingSchemaColumnError(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = error?.message || '';
  return error?.code === 'PGRST204' || /Could not find the '.*' column of 'learning_goals'/i.test(message);
}

function getMissingSchemaColumn(error: { message?: string } | null | undefined): string | null {
  const match = (error?.message || '').match(/Could not find the '([^']+)' column of 'learning_goals'/i);
  return match?.[1] || null;
}

function mapGoalRow(row: Row): CareerGoal {
  return {
    id: row.id,
    userId: row.user_id,
    targetRole: row.target_role,
    currentRole: row.current_role || undefined,
    fieldOfStudy: row.field_of_study || undefined,
    competencies: Array.isArray(row.competencies) ? row.competencies : [],
    context: row.context || undefined,
    seniority: row.seniority || undefined,
    timeframeMonths: row.timeframe_months,
    hoursPerWeek: row.hours_per_week,
    strategyId: row.strategy_id || undefined,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    lang: (row.lang as 'fr' | 'en') || 'fr',
  };
}

function mapProgressRow(row: Row): SkillProgress {
  return {
    skill: row.skill,
    state: row.state,
    hoursLogged: Number(row.hours_logged) || 0,
    validatedAt: row.validated_at || undefined,
  };
}

function mapTaskRow(row: Row): WeeklyTask {
  return {
    id: row.id,
    goalId: row.goal_id,
    weekNumber: row.week_number,
    skill: row.skill,
    description: row.description,
    resourceRef: row.resource || undefined,
    status: row.status,
  };
}

// Resource feedback rating is stored as a smallint on the DB (not the app's
// 'up' | 'down' string union) — 1 for up, -1 for down.
function ratingToSmallint(rating: 'up' | 'down'): number {
  return rating === 'up' ? 1 : -1;
}

// In-flight AI generation job state. Deliberately not persisted — there is
// no dedicated Supabase table for LearningJob (see task brief): these are
// short-lived polling records for a request in progress, never survive a
// reload, and never need to sync across devices or accounts.
const jobs = new Map<string, LearningJob>();

export class SupabaseLearningRepository implements ILearningRepository {
  async listGoals(userId: string): Promise<CareerGoal[]> {
    if (!supabase || !userId) return [];
    const { data, error } = await supabase
      .from('learning_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];

    // Deduplicate goals by target_role so users don't see multiple identical cards
    const uniqueGoalsMap = new Map<string, Row>();
    const duplicateIdsToDelete: string[] = [];

    for (const row of data as Row[]) {
      const normalizedKey = (row.target_role || '').trim().toLowerCase();
      if (!normalizedKey) continue;

      const existing = uniqueGoalsMap.get(normalizedKey);
      if (!existing) {
        uniqueGoalsMap.set(normalizedKey, row);
      } else {
        if (row.is_active && !existing.is_active) {
          duplicateIdsToDelete.push(existing.id as string);
          uniqueGoalsMap.set(normalizedKey, row);
        } else {
          duplicateIdsToDelete.push(row.id as string);
        }
      }
    }

    // Clean up duplicate rows in Supabase asynchronously
    if (duplicateIdsToDelete.length > 0) {
      void Promise.resolve(
        supabase.from('learning_goals').delete().in('id', duplicateIdsToDelete)
      ).catch(() => undefined);
    }

    return Array.from(uniqueGoalsMap.values()).map(mapGoalRow);
  }

  async getActiveGoal(userId: string): Promise<CareerGoal | null> {
    if (!supabase || !userId) return null;
    const { data: activeRow } = await supabase
      .from('learning_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeRow) return mapGoalRow(activeRow);

    // No active goal flagged — fall back to the most recently created one,
    // matching LocalLearningRepository's `goals[0]` fallback behavior.
    const { data: latestRow } = await supabase
      .from('learning_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return latestRow ? mapGoalRow(latestRow) : null;
  }

  async saveGoal(userId: string, input: SaveGoalInput): Promise<CareerGoal> {
    if (!supabase) throw new Error('Supabase non configuré.');

    const normalizedTargetRole = input.targetRole.trim().toLowerCase();

    // Check if an existing goal with the same target role already exists
    const { data: existingRows } = await supabase
      .from('learning_goals')
      .select('*')
      .eq('user_id', userId);

    const matchingGoal = (existingRows as Row[] | null)?.find(
      (r) => (r.target_role || '').trim().toLowerCase() === normalizedTargetRole
    );

    await supabase
      .from('learning_goals')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true);

    const payload = {
      user_id: userId,
      target_role: input.targetRole,
      current_role: input.currentRole || null,
      field_of_study: input.fieldOfStudy || null,
      competencies: input.competencies || [],
      context: input.context || null,
      seniority: input.seniority || 'mid',
      timeframe_months: input.timeframeMonths,
      hours_per_week: input.hoursPerWeek,
      strategy_id: input.strategyId || null,
      is_active: true,
      lang: input.lang || 'fr',
    };

    // If matching goal already exists, UPDATE it in place instead of creating a duplicate!
    if (matchingGoal?.id) {
      const extraIds = (existingRows as Row[])
        .filter(
          (r) =>
            r.id !== matchingGoal.id &&
            (r.target_role || '').trim().toLowerCase() === normalizedTargetRole
        )
        .map((r) => r.id as string);

      if (extraIds.length > 0) {
        try {
          await supabase.from('learning_goals').delete().in('id', extraIds);
        } catch {
          // Ignore cleanup errors
        }
      }

      const updateResult = await supabase
        .from('learning_goals')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', matchingGoal.id)
        .select()
        .single();

      if (!updateResult.error && updateResult.data) {
        return mapGoalRow(updateResult.data);
      }
    }

    let insertPayload: Row = { ...payload };
    let data: Row | null = null;
    let error: { message?: string; code?: string } | null = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const result = await supabase.from('learning_goals').insert(insertPayload).select().single();
      data = result.data as Row | null;
      error = result.error;

      if (!error) break;

      const missingColumn = getMissingSchemaColumn(error);
      if (!isMissingSchemaColumnError(error) || !missingColumn || !(missingColumn in insertPayload)) {
        break;
      }

      const { [missingColumn]: _removed, ...nextPayload } = insertPayload;
      insertPayload = nextPayload;
    }

    if (error || !data) throw new Error(error?.message || 'Failed to save goal.');
    return mapGoalRow(data);
  }

  async deleteGoal(userId: string, goalId: string): Promise<void> {
    if (!supabase || !userId || !goalId) return;
    await supabase.from('learning_goals').delete().eq('user_id', userId).eq('id', goalId);
    await supabase.from('learning_tasks').delete().eq('user_id', userId).eq('goal_id', goalId);
  }

  async setActiveGoal(userId: string, goalId: string): Promise<void> {
    if (!supabase || !userId) return;
    await supabase
      .from('learning_goals')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .neq('id', goalId);
    await supabase
      .from('learning_goals')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('id', goalId);
  }

  async getLatestReport(userId: string, goalId: string): Promise<SkillGapReport | null> {
    if (!supabase || !userId || !goalId) return null;
    const { data, error } = await supabase
      .from('learning_gap_reports')
      .select('report')
      .eq('user_id', userId)
      .eq('goal_id', goalId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return (data.report as SkillGapReport) || null;
  }

  async saveReport(userId: string, report: SkillGapReport): Promise<void> {
    if (!supabase || !userId) return;
    const { error } = await supabase.from('learning_gap_reports').insert({
      user_id: userId,
      goal_id: report.goalId,
      report,
      source: report.source,
      generated_at: report.generatedAt,
    });
    if (error) throw new Error(error.message);
  }

  async getRoadmap(userId: string, goalId: string): Promise<Roadmap | null> {
    if (!supabase || !userId || !goalId) return null;
    const { data, error } = await supabase
      .from('learning_roadmaps')
      .select('roadmap')
      .eq('user_id', userId)
      .eq('goal_id', goalId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return (data.roadmap as Roadmap) || null;
  }

  async saveRoadmap(userId: string, roadmap: Roadmap): Promise<void> {
    if (!supabase || !userId) return;
    const { error } = await supabase.from('learning_roadmaps').insert({
      user_id: userId,
      goal_id: roadmap.goalId,
      roadmap,
      estimated_weeks: roadmap.estimatedWeeks,
      generated_at: roadmap.generatedAt,
    });
    if (error) throw new Error(error.message);
  }

  async listTasks(userId: string, goalId: string): Promise<WeeklyTask[]> {
    if (!supabase || !userId || !goalId) return [];
    const { data, error } = await supabase
      .from('learning_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('goal_id', goalId)
      .order('week_number', { ascending: true });
    if (error || !data) return [];
    return data.map(mapTaskRow);
  }

  async upsertTasks(userId: string, goalId: string, tasks: WeeklyTask[]): Promise<void> {
    if (!supabase || !userId || !goalId) return;
    // Matches LocalLearningRepository's replace-the-whole-set semantics:
    // this is only ever called with a freshly derived task list for a goal
    // that (per the calling use-cases) doesn't already have one.
    await supabase.from('learning_tasks').delete().eq('user_id', userId).eq('goal_id', goalId);
    if (tasks.length === 0) return;
    const { error } = await supabase.from('learning_tasks').insert(
      tasks.map((t) => ({
        user_id: userId,
        goal_id: goalId,
        week_number: t.weekNumber,
        skill: t.skill,
        description: t.description,
        resource: t.resourceRef || null,
        status: t.status,
      }))
    );
    if (error) throw new Error(error.message);
  }

  async setTaskStatus(userId: string, taskId: string, status: 'todo' | 'done'): Promise<void> {
    if (!supabase || !userId || !taskId) return;
    const { error } = await supabase
      .from('learning_tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  }

  async listProgress(userId: string, goalId: string): Promise<SkillProgress[]> {
    if (!supabase || !userId || !goalId) return [];
    const { data, error } = await supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('goal_id', goalId);
    if (error || !data) return [];
    return data.map(mapProgressRow);
  }

  async upsertProgress(userId: string, goalId: string, progress: SkillProgress): Promise<void> {
    if (!supabase || !userId || !goalId) return;

    const { data: existing } = await supabase
      .from('learning_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('goal_id', goalId)
      .ilike('skill', progress.skill)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('learning_progress')
        .update({
          state: progress.state,
          hours_logged: progress.hoursLogged,
          validated_at: progress.validatedAt || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('learning_progress').insert({
        user_id: userId,
        goal_id: goalId,
        skill: progress.skill,
        state: progress.state,
        hours_logged: progress.hoursLogged,
        validated_at: progress.validatedAt || null,
      });
      if (error) throw new Error(error.message);
    }
  }

  async saveResourceFeedback(userId: string, fb: ResourceFeedback): Promise<void> {
    if (!supabase || !userId) return;
    const { error } = await supabase.from('learning_resource_feedback').insert({
      user_id: userId,
      skill: fb.skill,
      provider: fb.provider,
      title: fb.title,
      rating: ratingToSmallint(fb.rating),
    });
    if (error) throw new Error(error.message);
  }

  async getStats(userId: string): Promise<LearningStats> {
    const activeGoal = await this.getActiveGoal(userId);
    if (!activeGoal) {
      return {
        activeGoalRole: 'Aucun objectif actif',
        readiness: 0,
        skillsValidated: 0,
        skillsTotal: 0,
        currentStreakDays: 1,
        xp: 0,
        level: 1,
        badgeCount: 0,
      };
    }

    const report = await this.getLatestReport(userId, activeGoal.id);
    const progress = await this.listProgress(userId, activeGoal.id);

    const readiness = computeReadiness({
      gaps: report?.gaps || [],
      progress,
      atsScore: 72,
    });

    const { xp, level, badgeCount } = XPCalculator.calculateXP(progress, 5);

    return {
      activeGoalRole: activeGoal.targetRole,
      readiness,
      skillsValidated: progress.filter((p) => p.state === 'validated').length,
      skillsTotal: report?.gaps.length || 4,
      currentStreakDays: 5,
      xp,
      level,
      badgeCount,
    };
  }

  // Async job management — transient, in-memory only (see module comment above).
  async createJob(userId: string, goalId: string, kind: 'gap' | 'roadmap'): Promise<LearningJob> {
    const job: LearningJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      goalId,
      kind,
      status: 'queued',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    jobs.set(job.id, job);
    return job;
  }

  async getJob(jobId: string): Promise<LearningJob | null> {
    return jobs.get(jobId) || null;
  }

  async updateJob(jobId: string, updates: Partial<LearningJob>): Promise<void> {
    const existing = jobs.get(jobId);
    if (existing) {
      jobs.set(jobId, { ...existing, ...updates, updatedAt: new Date().toISOString() });
    }
  }
}
