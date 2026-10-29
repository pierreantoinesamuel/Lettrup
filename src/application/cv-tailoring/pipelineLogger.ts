import { getSupabaseAdminClient } from '../../infrastructure/supabase/supabaseAdminClient';
import { PipelineTask } from './types';

export interface PipelineRunLog {
  userId: string;
  cvId: string;
  jobUrl?: string;
  task: PipelineTask;
  matchScore?: number;
  durationMs: number;
  tokensUsed?: number;
  success: boolean;
  error?: string;
}

export async function logPipelineRun(log: PipelineRunLog): Promise<void> {
  try {
    const admin = getSupabaseAdminClient();
    await admin.from('pipeline_runs').insert({
      user_id: log.userId,
      cv_id: log.cvId,
      job_url: log.jobUrl ?? null,
      task: log.task,
      match_score: log.matchScore ?? null,
      duration_ms: log.durationMs,
      tokens_used: log.tokensUsed ?? null,
      success: log.success,
      error: log.error ?? null,
    });
  } catch {
    // Logging failures must never break the main pipeline
  }
}
