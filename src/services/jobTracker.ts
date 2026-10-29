import { JobStatus } from '../types';
import { supabase } from '../lib/supabase';

export interface JobTrackerApplication {
  id: string;
  user_id: string;
  company: string;
  role: string;
  status: JobStatus;
  location?: string;
  salary?: string;
  url?: string;
  logo?: string;
  notes?: string;
  date_added: string;
  is_internal?: boolean;
  job_id?: string;
}

function fmtDateAdded(value: string | null | undefined): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): JobTrackerApplication {
  return {
    id: row.id,
    user_id: row.user_id,
    company: row.company,
    role: row.role,
    status: (row.status as JobStatus) || 'Saved',
    location: row.location || undefined,
    salary: row.salary || undefined,
    url: row.url || undefined,
    logo: row.logo || undefined,
    notes: row.notes || undefined,
    date_added: fmtDateAdded(row.date_added || row.created_at),
    is_internal: row.is_internal ?? undefined,
    job_id: row.job_id || undefined,
  };
}

export async function getUserJobApplications(userId: string): Promise<JobTrackerApplication[]> {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('job_tracker_applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function saveJobApplication(
  userId: string,
  input: {
    company: string;
    role: string;
    status?: JobStatus;
    location?: string;
    salary?: string;
    url?: string;
    notes?: string;
    source?: string;
    job_id?: string;
    is_internal?: boolean;
  }
): Promise<JobTrackerApplication> {
  if (!supabase) throw new Error('Supabase non configuré.');

  const { data: existing } = await supabase
    .from('job_tracker_applications')
    .select('id, company, role, job_id')
    .eq('user_id', userId);
  const duplicate = (existing || []).find((a: any) =>
    input.job_id
      ? a.job_id === input.job_id
      : a.company.toLowerCase() === input.company.toLowerCase() && a.role.toLowerCase() === input.role.toLowerCase()
  );
  if (duplicate) {
    throw new Error('This job is already in your tracker.');
  }

  const { data, error } = await supabase
    .from('job_tracker_applications')
    .insert({
      user_id: userId,
      company: input.company,
      role: input.role,
      status: input.status || 'Saved',
      location: input.location,
      salary: input.salary,
      url: input.url,
      notes: input.notes,
      source: input.source,
      job_id: input.job_id,
      is_internal: input.is_internal,
      date_added: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to save job application.');
  return mapRow(data);
}

export async function updateJobApplication(
  id: string,
  userId: string,
  updates: Partial<JobTrackerApplication> & { applied_date?: string }
): Promise<JobTrackerApplication> {
  if (!supabase) throw new Error('Supabase non configuré.');

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of Object.keys(updates) as (keyof typeof updates)[]) {
    if (key === 'id' || key === 'user_id') continue;
    const value = updates[key];
    payload[key as string] = value === undefined ? null : value;
  }

  const { data, error } = await supabase
    .from('job_tracker_applications')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Job application not found');
  return mapRow(data);
}

export async function deleteJobApplication(id: string, userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('job_tracker_applications')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  return !error;
}

export async function getUserApplicationStats(userId: string) {
  const apps = await getUserJobApplications(userId);
  return {
    total_count: apps.length,
    saved_count: apps.filter((a) => a.status === 'Saved').length,
    applied_count: apps.filter((a) => a.status === 'Applied').length,
    interview_count: apps.filter((a) => a.status === 'Interview').length,
    offer_count: apps.filter((a) => a.status === 'Offer').length,
    rejected_count: apps.filter((a) => a.status === 'Rejected').length,
  };
}
