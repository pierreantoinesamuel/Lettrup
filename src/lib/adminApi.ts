import { supabase } from './supabase';
import type { Article } from '../components/admin/adminData';

export interface AdminCandidate {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  cvCount: number;
  applicationCount: number;
  lastLogin: string;
  status: 'active' | 'suspended' | 'banned';
  createdAt: string;
}

export interface AdminEmployer {
  id: string;
  companyName: string;
  email: string;
  industry: string;
  companySize: string;
  website: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  jobCount: number;
  applicationsReceived: number;
  status: 'active' | 'suspended';
  createdAt: string;
}

export type AdminJobStatus = 'pending_review' | 'active' | 'rejected' | 'suspended' | 'filled';
export type AdminJobFlagStatus = 'normal' | 'suspicious' | 'spam';

export interface AdminJob {
  id: string;
  title: string;
  companyName: string;
  employerId: string;
  location: string;
  jobType: string;
  salaryRange: string;
  status: AdminJobStatus;
  flagStatus: AdminJobFlagStatus;
  flagReason?: string;
  applicantCount: number;
  postedDate: string;
  description: string;
  screeningQuestions: string[];
}

export type AdminApplicationStatus = 'pending' | 'auto_rejected' | 'under_review' | 'shortlisted' | 'rejected' | 'hired';

export interface AdminApplication {
  id: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  companyName: string;
  matchScore: number;
  status: AdminApplicationStatus;
  appliedDate: string;
  autoRejected: boolean;
  autoRejectionReason?: string;
  reviewStatus: 'pending_human' | 'approved' | 'overridden';
  screeningAnswers: { question: string; answer: string }[];
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR');
  } catch {
    return '—';
  }
}

export async function listCandidates(): Promise<AdminCandidate[]> {
  if (!supabase) return [];
  const client = supabase;
  const { data, error } = await client
    .from('profiles')
    .select('id, name, email, target_title, plan, account_status, created_at, last_activity')
    .eq('role', 'job_seeker')
    .order('created_at', { ascending: false });
  if (error || !data) return [];

  return Promise.all(
    data.map(async (row) => {
      const [{ count: cvCount }, { count: applicationCount }] = await Promise.all([
        client.from('user_resumes').select('id', { count: 'exact', head: true }).eq('user_id', row.id),
        client.from('applications').select('id', { count: 'exact', head: true }).eq('applicant_id', row.id),
      ]);
      return {
        id: row.id,
        name: row.name || row.email,
        email: row.email,
        role: row.target_title || '—',
        plan: row.plan || 'free_trial',
        cvCount: cvCount || 0,
        applicationCount: applicationCount || 0,
        lastLogin: fmtDateTime(row.last_activity),
        status: (row.account_status as AdminCandidate['status']) || 'active',
        createdAt: fmtDate(row.created_at),
      };
    })
  );
}

export async function listEmployers(): Promise<AdminEmployer[]> {
  if (!supabase) return [];
  const client = supabase;
  // Not `.eq('role', 'recruiter')`: signup never grants that role directly
  // (see handleEmployerVerificationRoute) — a recruiter applicant is still
  // 'job_seeker' until an admin approves them, so the only reliable signal
  // that a profile is a recruiter application (pending, approved, or
  // rejected) is that it has company info at all.
  const { data, error } = await client
    .from('profiles')
    .select('id, company_name, email, company_website, verification_status, account_status, created_at')
    .not('company_name', 'is', null)
    .order('created_at', { ascending: false });
  if (error || !data) return [];

  return Promise.all(
    data.map(async (row) => {
      const { data: jobRows } = await client.from('jobs').select('id').eq('employer_id', row.id);
      const jobIds = (jobRows || []).map((j) => j.id);
      let applicationsReceived = 0;
      if (jobIds.length > 0) {
        const { count } = await client.from('applications').select('id', { count: 'exact', head: true }).in('job_id', jobIds);
        applicationsReceived = count || 0;
      }
      return {
        id: row.id,
        companyName: row.company_name || row.email,
        email: row.email,
        industry: '—',
        companySize: '—',
        website: row.company_website || '',
        verificationStatus: (row.verification_status as AdminEmployer['verificationStatus']) || 'pending',
        jobCount: jobIds.length,
        applicationsReceived,
        status: row.account_status === 'suspended' || row.account_status === 'banned' ? 'suspended' : 'active',
        createdAt: fmtDate(row.created_at),
      };
    })
  );
}

async function getAuthToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function adminMutation(action: string, targetId: string, values: Record<string, unknown>): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error('Authentification requise.');
  const res = await fetch('/api/admin/mutation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, targetId, values }),
  });
  const result = await res.json();
  if (!res.ok || !result.success) throw new Error(result.error || 'La mise à jour a échoué.');
}

async function adminBlogRequest(body: Record<string, unknown>): Promise<Article[]> {
  const token = await getAuthToken();
  if (!token) throw new Error('Authentification requise.');

  const res = await fetch('/api/admin/blog-posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw new Error(result.error || "L'article n'a pas pu être publié dans le blog.");
  }
  return result.articles || [];
}

export async function listBlogArticlesForAdmin(): Promise<Article[]> {
  return adminBlogRequest({ action: 'list' });
}

export async function publishBlogArticleForAdmin(article: Article): Promise<Article[]> {
  return adminBlogRequest({ action: 'save', article });
}

export async function deleteBlogArticleForAdmin(slug: string): Promise<Article[]> {
  return adminBlogRequest({ action: 'delete', slug });
}

export async function setBlogArticleFeaturedForAdmin(slug: string, featured: boolean): Promise<Article[]> {
  return adminBlogRequest({ action: 'set_featured', slug, featured });
}

export async function setEmployerVerification(id: string, status: 'approved' | 'rejected'): Promise<void> {
  // Granting 'recruiter' requires the service-role client (profiles.role is
  // column-level REVOKEd from authenticated/anon), so this goes through the
  // admin-only server route instead of a direct client-side update.
  const token = await getAuthToken();
  if (!token) throw new Error('Authentification requise.');

  const res = await fetch('/api/admin/employer-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ employerId: id, status }),
  });
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw new Error(result.error || "La mise à jour a échoué.");
  }
}

// Super-admin only (server route re-verifies profiles.is_super_admin) —
// promotes an existing account to role='admin' by email.
export async function promoteToAdmin(email: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error('Authentification requise.');

  const res = await fetch('/api/admin/promote-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email }),
  });
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw new Error(result.error || "La promotion a échoué.");
  }
}

export async function setAccountStatus(id: string, status: AdminCandidate['status']): Promise<void> {
  await adminMutation('account_status', id, { status });
}

export async function updateCandidateProfile(
  id: string,
  updates: { name?: string; role?: string; plan?: string }
): Promise<void> {
  await adminMutation('candidate_profile', id, updates);
}

export async function listJobsForAdmin(): Promise<AdminJob[]> {
  if (!supabase) return [];
  const client = supabase;
  const { data, error } = await client
    .from('jobs')
    .select('id, title, company, employer_id, location, type, salary_range, status, flag_status, flag_reason, description, created_at')
    .order('created_at', { ascending: false });
  if (error || !data) return [];

  return Promise.all(
    data.map(async (row) => {
      const [{ count: applicantCount }, { data: questions }] = await Promise.all([
        client.from('applications').select('id', { count: 'exact', head: true }).eq('job_id', row.id),
        client.from('screening_questions').select('question').eq('job_id', row.id).order('order', { ascending: true }),
      ]);
      return {
        id: row.id,
        title: row.title,
        companyName: row.company || '—',
        employerId: row.employer_id,
        location: row.location || '—',
        jobType: row.type || '—',
        salaryRange: row.salary_range || '—',
        status: (row.status as AdminJobStatus) || 'pending_review',
        flagStatus: (row.flag_status as AdminJobFlagStatus) || 'normal',
        flagReason: row.flag_reason || undefined,
        applicantCount: applicantCount || 0,
        postedDate: fmtDate(row.created_at),
        description: row.description || '',
        screeningQuestions: (questions || []).map((q) => q.question),
      };
    })
  );
}

export async function updateJobStatus(
  id: string,
  status: AdminJobStatus,
  flagStatus?: AdminJobFlagStatus,
  flagReason?: string | null
): Promise<void> {
  await adminMutation('job_status', id, { status, flag_status: flagStatus, flag_reason: flagReason });
}

export async function bulkApproveJobs(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => adminMutation('job_status', id, { status: 'active', flag_status: 'normal' })));
}

export async function listApplicationsForAdmin(): Promise<AdminApplication[]> {
  if (!supabase) return [];
  const client = supabase;
  const { data, error } = await client
    .from('applications')
    .select(
      'id, applicant_id, job_id, applicant_name, email, match_score, status, review_status, auto_rejected, auto_rejection_reason, applied_at, jobs(title, company)'
    )
    .order('applied_at', { ascending: false });
  if (error || !data) return [];

  return Promise.all(
    (data as any[]).map(async (row) => {
      const { data: answerRows } = await client
        .from('screening_answers')
        .select('answer, screening_questions!inner(question, job_id)')
        .eq('applicant_id', row.applicant_id)
        .eq('screening_questions.job_id', row.job_id);
      return {
        id: row.id,
        candidateName: row.applicant_name || row.email || '—',
        candidateEmail: row.email || '—',
        jobTitle: row.jobs?.title || '—',
        companyName: row.jobs?.company || '—',
        matchScore: row.match_score != null ? Number(row.match_score) : 0,
        status: (row.status as AdminApplicationStatus) || 'pending',
        appliedDate: fmtDate(row.applied_at),
        autoRejected: !!row.auto_rejected,
        autoRejectionReason: row.auto_rejection_reason || undefined,
        reviewStatus: (row.review_status as AdminApplication['reviewStatus']) || 'pending_human',
        screeningAnswers: (answerRows || []).map((a: any) => ({
          question: a.screening_questions?.question || '',
          answer: a.answer,
        })),
      };
    })
  );
}

export async function overrideApplicationDecision(id: string, newStatus: AdminApplicationStatus): Promise<void> {
  await adminMutation('application_status', id, { status: newStatus });
}

export interface AdminActor {
  id: string;
  name: string;
  role: string;
}

export async function logAdminAction(
  admin: AdminActor,
  actionType: string,
  targetType: string,
  targetId: string,
  notes: string
): Promise<void> {
  if (!supabase) return;
  await supabase.from('admin_audit_log').insert({
    admin_id: admin.id,
    admin_name: admin.name,
    admin_role: admin.role,
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    notes,
  });
}
