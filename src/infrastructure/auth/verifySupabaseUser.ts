/**
 * Infrastructure Layer: Verifies a Supabase access token server-side
 *
 * Billing routes must act on the caller's own account, not whatever userId
 * the client happens to send — this resolves the real user from their
 * session token instead of trusting request body fields.
 */

import { createClient } from '@supabase/supabase-js';

export interface VerifiedUser {
  id: string;
  email: string;
}

export async function verifySupabaseUser(authorizationHeader: string | undefined): Promise<VerifiedUser | null> {
  const token = authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.slice(7) : undefined;
  if (!token) {
    return null;
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }

  const client = createClient(url, anonKey);
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }
    return { id: data.user.id, email: data.user.email || '' };
  } catch (err) {
    // A network/DNS failure reaching Supabase's auth API throws here rather
    // than resolving with `error` — every route handler calls this unguarded
    // at the top before its own try/catch starts, and Express 4 does not
    // auto-catch a rejected async handler (it just leaves the request
    // hanging with no response ever sent, no console error). Treating any
    // failure as "unauthenticated" keeps every caller's `if (!user)` branch
    // as the single source of truth instead of every route needing its own
    // guard around this call.
    console.error('[verifySupabaseUser] Auth check failed:', err);
    return null;
  }
}
