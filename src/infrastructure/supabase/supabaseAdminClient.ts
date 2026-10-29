/**
 * Infrastructure Layer: Supabase service-role client (server-only)
 *
 * profiles.plan and the stripe_* billing columns are protected by DB
 * triggers (see migrations "protect_profile_plan_column" and 012) that
 * reject writes from anything but the service_role — this client is the
 * only thing in the codebase allowed to hold that key. Never import this
 * from client code or from anything Vite bundles for the browser.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured');
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}
