/**
 * Infrastructure Layer: server-side reads of real recruiter-posted jobs
 *
 * Backs server.ts's per-posting SSR SEO metadata (/job/:id, /jobs/:id) and
 * the dynamic sitemap. Until now, every real job (from the `jobs` table)
 * fell back to generic placeholder metadata — only the 2 hardcoded demo
 * jobs in SAMPLE_PUBLIC_JOBS had real titles/descriptions, so every actual
 * posting was indexed as duplicate/generic content (SEO audit follow-up).
 *
 * Live schema verified directly against Supabase (tmbgzfsuchjkgelcmasd) on
 * 2026-08-12 — this diverges from src/database/supabase_schema.sql in a few
 * places (extra columns, and the public-read RLS policy checks
 * status = 'active', not 'published' as the doc claims). Query against
 * what's actually live, not the doc.
 */

import { getSupabaseAnonClient } from '../supabase/supabaseAnonClient';

export interface JobSeoData {
  id: string;
  title: string;
  company: string;
  location: string | null;
  type: string | null;
  description: string;
  createdAt: string;
  updatedAt: string;
  remote: boolean;
}

export interface JobSitemapEntry {
  id: string;
  updatedAt: string;
}

// Spam-flagged jobs are still 'active' for the poster's own dashboard, but
// must never be handed to a crawler or listed in the sitemap.
const PUBLIC_JOB_FILTER = { status: 'active', excludeFlag: 'spam' } as const;

export async function getActiveJobForSeo(id: string): Promise<JobSeoData | null> {
  const client = getSupabaseAnonClient();
  if (!client) return null;

  const { data, error } = await client
    .from('jobs')
    .select('id, title, company, location, type, description, created_at, updated_at, remote, status, flag_status')
    .eq('id', id)
    .eq('status', PUBLIC_JOB_FILTER.status)
    .neq('flag_status', PUBLIC_JOB_FILTER.excludeFlag)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    company: data.company || 'Entreprise Partenaire',
    location: data.location,
    type: data.type,
    description: data.description || '',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    remote: Boolean(data.remote),
  };
}

export async function listActiveJobsForSitemap(): Promise<JobSitemapEntry[]> {
  const client = getSupabaseAnonClient();
  if (!client) return [];

  const { data, error } = await client
    .from('jobs')
    .select('id, updated_at')
    .eq('status', PUBLIC_JOB_FILTER.status)
    .neq('flag_status', PUBLIC_JOB_FILTER.excludeFlag)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row: { id: string; updated_at: string }) => ({ id: row.id, updatedAt: row.updated_at }));
}
