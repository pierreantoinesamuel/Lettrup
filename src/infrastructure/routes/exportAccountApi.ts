/**
 * Infrastructure Layer: API Route Handler for account data export (RGPD "droit à la portabilité", Art. 20)
 * Route: GET /api/account/export
 *
 * Aggregates every table that stores this user's personal data, using the
 * service-role client so it's not gated by RLS ownership checks the client
 * would otherwise need duplicated here. The old client-side export only
 * dumped localStorage + the in-memory profile object, which is not what
 * Art. 20 portability requires (see security audit 2.2).
 *
 * Table list was cross-checked against pg_constraint directly (not
 * information_schema.constraint_column_usage, which silently omits some
 * cross-schema FKs pointing at auth.users on this project) to find every
 * table with an ON DELETE CASCADE tied to this user — the same set that
 * deleteAccountApi.ts's cascade relies on. Tables where the FK is instead
 * ON DELETE SET NULL (applications, blog_authors/posts/comments/media/
 * revisions, career_lesson_templates) are content that's designed to
 * outlive its creator, not the user's own data, so they're intentionally
 * excluded here — same judgment call deleteAccountApi.ts makes by leaving
 * them alone.
 *
 * blog_views is the one SET NULL exception: a view record isn't content the
 * user authored (unlike a post/comment), it's reading-history activity
 * about them (which article, when, from where) — real personal data that
 * belongs in a portability export, so it's fetched separately below by
 * viewer_id instead of being lumped in with the "outlives its creator" group.
 */

import { getSupabaseAdminClient } from '../supabase/supabaseAdminClient';
import { verifySupabaseUser } from '../auth/verifySupabaseUser';

export interface ExportAccountApiResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// Every table keyed by user_id that holds personal data. profiles and
// user_onboarding are fetched separately below (single-row, different key);
// screening_answers too (keyed by applicant_id, not user_id).
const USER_ID_TABLES = [
  'user_resumes',
  'user_cover_letters',
  'website_configs',
  'scan_history',
  'interview_sessions',
  'linkedin_audits',
  'job_tracker_applications',
  'career_strategies',
  'career_user_profiles',
  'career_user_skills',
  'career_user_lesson_paths',
  'career_growth_progress',
  'career_growth_lessons',
  'content_roles',
  'job_search_queries',
  'user_roadmap_progress',
  'learning_goals',
  'learning_events',
  'learning_gap_reports',
  'learning_roadmaps',
  'learning_tasks',
  'learning_progress',
  'learning_resource_feedback',
  'ai_usage_ledger',
  'ai_user_monthly_spend',
  'user_activities',
  'export_entitlements',
] as const;

export async function handleExportAccountRoute(
  authorizationHeader: string | undefined
): Promise<ExportAccountApiResponse> {
  const caller = await verifySupabaseUser(authorizationHeader);
  if (!caller) {
    return { success: false, error: 'Authentification requise.' };
  }

  const admin = getSupabaseAdminClient();
  const exportedData: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    userId: caller.id,
  };

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('*')
    .eq('id', caller.id)
    .maybeSingle();
  if (profileError) {
    return { success: false, error: profileError.message };
  }
  exportedData.profile = profile;

  const { data: onboarding } = await admin
    .from('user_onboarding')
    .select('*')
    .eq('user_id', caller.id)
    .maybeSingle();
  exportedData.onboarding = onboarding || null;

  for (const table of USER_ID_TABLES) {
    const { data: rows, error } = await admin.from(table).select('*').eq('user_id', caller.id);
    exportedData[table] = error ? [] : rows || [];
  }

  // Recruiter-side data: jobs they posted, and applications received on those jobs.
  if (profile?.role === 'recruiter' || profile?.role === 'admin') {
    const { data: jobs } = await admin.from('jobs').select('*').eq('employer_id', caller.id);
    exportedData.jobsPosted = jobs || [];
  }

  // Candidate-side data: applications this user submitted to job postings,
  // and their own answers to each job's screening questions.
  const { data: applications } = await admin.from('applications').select('*').eq('applicant_id', caller.id);
  exportedData.applicationsSubmitted = applications || [];

  const { data: screeningAnswers } = await admin.from('screening_answers').select('*').eq('applicant_id', caller.id);
  exportedData.screeningAnswers = screeningAnswers || [];

  const { data: blogViews } = await admin.from('blog_views').select('*').eq('viewer_id', caller.id);
  exportedData.blogViews = blogViews || [];

  return { success: true, data: exportedData };
}
