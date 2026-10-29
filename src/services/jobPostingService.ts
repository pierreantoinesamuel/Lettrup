// Client-side read of a single active, non-spam job posting from the real
// `jobs` table — backs the public /job/:id page for ids that aren't one of
// the 2 hardcoded demo postings. Relies on the "public_select_published_jobs"
// RLS policy (status = 'active'), so the anon key is sufficient.

import { supabase } from '../lib/supabase';

export interface PublicJobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary?: string;
  datePosted: string;
  description: string;
  requirements: string[];
  skills: string[];
}

export async function getActiveJobById(id: string): Promise<PublicJobPosting | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('jobs')
    .select('id, title, company, location, type, salary_range, description, requirements, required_skills, created_at, status, flag_status')
    .eq('id', id)
    .eq('status', 'active')
    .neq('flag_status', 'spam')
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    company: data.company || 'Entreprise Partenaire',
    location: data.location || 'France',
    type: data.type || 'CDI - Temps plein',
    salary: data.salary_range || undefined,
    datePosted: data.created_at ? data.created_at.split('T')[0] : '',
    description: data.description || '',
    requirements: Array.isArray(data.requirements) ? data.requirements : [],
    skills: Array.isArray(data.required_skills) ? data.required_skills : [],
  };
}
