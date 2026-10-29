/**
 * Infrastructure Layer: API Route Handler for admin promotion
 * Route: POST /api/admin/promote-admin
 *
 * Only the super-admin (profiles.is_super_admin = true, itself only ever
 * settable by direct SQL — see migration 014) can grant 'admin'. Mirrors
 * adminEmployerVerificationApi.ts: profiles.role is column-level REVOKEd
 * from authenticated/anon, so this goes through the service-role client
 * after re-verifying the caller server-side, never a direct client update.
 */

import { getSupabaseAdminClient } from '../supabase/supabaseAdminClient';
import { verifySupabaseUser } from '../auth/verifySupabaseUser';

export interface PromoteAdminApiRequest {
  email: string;
}

export interface PromoteAdminApiResponse {
  success: boolean;
  error?: string;
}

export async function handlePromoteAdminRoute(
  reqBody: PromoteAdminApiRequest,
  authorizationHeader: string | undefined
): Promise<PromoteAdminApiResponse> {
  const caller = await verifySupabaseUser(authorizationHeader);
  if (!caller) {
    return { success: false, error: 'Authentification requise.' };
  }

  const targetEmail = reqBody.email?.trim().toLowerCase();
  if (!targetEmail) {
    return { success: false, error: 'Adresse e-mail requise.' };
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return {
      success: false,
      error: 'Configuration serveur incomplète : SUPABASE_SERVICE_ROLE_KEY est manquante.',
    };
  }

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('is_super_admin')
    .eq('id', caller.id)
    .maybeSingle();
  if (callerProfile?.is_super_admin !== true) {
    return { success: false, error: 'Accès refusé.' };
  }

  const { data: target } = await admin
    .from('profiles')
    .select('id, role')
    .eq('email', targetEmail)
    .maybeSingle();
  if (!target) {
    return { success: false, error: "Aucun compte n'existe avec cette adresse e-mail. La personne doit d'abord créer un compte." };
  }
  if (target.role === 'admin') {
    return { success: false, error: 'Ce compte est déjà administrateur.' };
  }

  const { error } = await admin.from('profiles').update({ role: 'admin' }).eq('id', target.id);
  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
