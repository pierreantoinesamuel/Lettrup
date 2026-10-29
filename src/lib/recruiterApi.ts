import { supabase } from './supabase';

export type PipelineStatus = 'nouveau' | 'en_revision' | 'entretien_planifie' | 'offre_envoyee' | 'engage' | 'refuse';

export interface RecruiterApplication {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidateRole: string;
  jobId: string;
  jobTitle: string;
  matchScore: number;
  matchGrade: string;
  appliedAt: string;
  pipelineStatus: PipelineStatus;
  keyMatchingSkills: string[];
  missingSkills: string[];
  resumeSnippet: string;
}

export type RecruiterJobStatus = 'pending_review' | 'active' | 'rejected' | 'suspended' | 'filled';

export interface RecruiterJob {
  id: string;
  title: string;
  company: string;
  location: string;
  contractType: string;
  remotePolicy: string;
  experienceLevel: string;
  salaryRange: string;
  requiredSkills: string[];
  descriptionText: string;
  benefitsText?: string;
  status: RecruiterJobStatus;
  createdAt: string;
  applicationsCount: number;
  matchScoreAverage: number;
}

export interface CreateJobInput {
  title: string;
  company: string;
  location: string;
  contractType: string;
  remotePolicy: string;
  experienceLevel: string;
  salaryRange: string;
  requiredSkills: string[];
  descriptionText: string;
  benefitsText?: string;
}

export function matchGradeFor(score: number): string {
  if (score >= 90) return 'Excellente Compatibilité';
  if (score >= 80) return 'Forte Compatibilité';
  if (score >= 70) return 'Bonne Compatibilité';
  return 'Compatibilité Moyenne';
}

export async function listRecruiterJobs(employerId: string): Promise<RecruiterJob[]> {
  if (!supabase) return [];
  const client = supabase;
  const { data, error } = await client
    .from('jobs')
    .select(
      'id, title, company, location, type, remote_policy, experience_level, salary_range, required_skills, description, advantages, status, created_at'
    )
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];

  return Promise.all(
    data.map(async (row) => {
      const { data: apps } = await client.from('applications').select('match_score').eq('job_id', row.id);
      const scores = (apps || []).map((a) => Number(a.match_score) || 0);
      const avg = scores.length > 0 ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : 0;
      return {
        id: row.id,
        title: row.title,
        company: row.company || '',
        location: row.location || '',
        contractType: row.type || 'CDI',
        remotePolicy: row.remote_policy || '',
        experienceLevel: row.experience_level || '',
        salaryRange: row.salary_range || '',
        requiredSkills: row.required_skills || [],
        descriptionText: row.description || '',
        benefitsText: row.advantages || undefined,
        status: (row.status as RecruiterJobStatus) || 'pending_review',
        createdAt: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '',
        applicationsCount: (apps || []).length,
        matchScoreAverage: avg,
      };
    })
  );
}

export async function createJob(employerId: string, input: CreateJobInput): Promise<RecruiterJob> {
  if (!supabase) throw new Error('Supabase non configuré.');

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      employer_id: employerId,
      title: input.title,
      company: input.company,
      location: input.location,
      type: input.contractType,
      remote_policy: input.remotePolicy,
      experience_level: input.experienceLevel,
      salary_range: input.salaryRange,
      required_skills: input.requiredSkills,
      description: input.descriptionText,
      advantages: input.benefitsText || null,
      status: 'active',
    })
    .select('id, created_at')
    .single();

  if (error || !data) throw new Error(error?.message || "Erreur lors de la création de l'offre.");

  return {
    id: data.id,
    title: input.title,
    company: input.company,
    location: input.location,
    contractType: input.contractType,
    remotePolicy: input.remotePolicy,
    experienceLevel: input.experienceLevel,
    salaryRange: input.salaryRange,
    requiredSkills: input.requiredSkills,
    descriptionText: input.descriptionText,
    benefitsText: input.benefitsText,
    status: 'active',
    createdAt: data.created_at ? new Date(data.created_at).toISOString().split('T')[0] : '',
    applicationsCount: 0,
    matchScoreAverage: 0,
  };
}

export async function listRecruiterApplications(employerId: string): Promise<RecruiterApplication[]> {
  if (!supabase) return [];
  const client = supabase;

  const { data: jobRows } = await client.from('jobs').select('id, title').eq('employer_id', employerId);
  const jobIds = (jobRows || []).map((j) => j.id);
  if (jobIds.length === 0) return [];
  const jobTitleById = new Map((jobRows || []).map((j) => [j.id, j.title]));

  const { data, error } = await client
    .from('applications')
    .select('id, applicant_name, email, job_id, match_score, pipeline_status, applied_at, resume_preview_json, profiles:applicant_id(target_title)')
    .in('job_id', jobIds)
    .order('applied_at', { ascending: false });
  if (error || !data) return [];

  return (data as any[]).map((row) => {
    const preview = row.resume_preview_json || {};
    const score = row.match_score != null ? Number(row.match_score) : 0;
    return {
      id: row.id,
      candidateName: row.applicant_name || row.email || '—',
      candidateEmail: row.email || '—',
      candidateRole: row.profiles?.target_title || '—',
      jobId: row.job_id,
      jobTitle: jobTitleById.get(row.job_id) || '—',
      matchScore: score,
      matchGrade: matchGradeFor(score),
      appliedAt: row.applied_at ? new Date(row.applied_at).toISOString().split('T')[0] : '',
      pipelineStatus: (row.pipeline_status as PipelineStatus) || 'nouveau',
      keyMatchingSkills: preview.matchingSkills || [],
      missingSkills: preview.missingSkills || [],
      resumeSnippet: preview.snippet || '',
    };
  });
}

export async function updatePipelineStatus(id: string, status: PipelineStatus): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('applications').update({ pipeline_status: status }).eq('id', id);
  if (error) throw new Error(error.message);
}
