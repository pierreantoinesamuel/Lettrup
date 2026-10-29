/**
 * Infrastructure Layer: Supabase anon-key client (server-only)
 *
 * For server-side reads that are already public via RLS (e.g. published
 * blog posts — see "blog_posts_public_read" policy) — no service-role key
 * needed here, unlike supabaseAdminClient.ts.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let anonClient: SupabaseClient | null = null;

export function getSupabaseAnonClient(): SupabaseClient | null {
  if (anonClient) {
    return anonClient;
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }

  anonClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return anonClient;
}
