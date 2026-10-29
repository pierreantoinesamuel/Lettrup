/**
 * Server-only read path for a published portfolio (website_configs row) by
 * its public slug. Uses the service-role client because anonymous visitors
 * have no Supabase session tied to the owning user_id, so client-side RLS
 * (scoped to auth.uid()) can never see someone else's config — this is the
 * one place allowed to bypass that, and it only ever returns rows that are
 * both slug-matched and is_published = true.
 */

import { getSupabaseAdminClient } from '../supabase/supabaseAdminClient';

export interface PublicPortfolio {
  id: string;
  userId: string;
  configName: string;
  template: string;
  sections: string[];
  resumeData: Record<string, unknown>;
  updatedAt: string;
}

// Matches the slug shape produced by buildSlug() in PortfolioBuilder.tsx.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export async function getPublishedPortfolioBySlug(slug: string | undefined | null): Promise<PublicPortfolio | null> {
  if (!slug || !SLUG_RE.test(slug)) return null;

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('website_configs')
    .select('id, user_id, config_name, template, sections, resume_data, updated_at')
    .eq('published_url', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    configName: data.config_name,
    template: data.template || 'modern',
    sections: Array.isArray(data.sections) ? data.sections : [],
    resumeData: data.resume_data || {},
    updatedAt: data.updated_at,
  };
}
