/**
 * Infrastructure Layer: API Route Handler for admin recruiter approval
 * Route: POST /api/admin/employer-verification
 *
 * public.profiles.role is column-level REVOKEd from authenticated/anon
 * (migrations 006/007/008) so that no client request — including an admin's
 * own logged-in session — can grant 'recruiter'/'admin'. That closed a real
 * self-escalation hole, but it also means the admin panel's "Approuver"
 * button cannot promote a recruiter applicant by itself anymore. This route
 * is the replacement: it re-verifies the caller is an 'admin' profile, then
 * uses the service-role client (not subject to the column revoke) to grant
 * 'recruiter' on approval.
 */

import { getSupabaseAdminClient } from '../supabase/supabaseAdminClient';
import { verifySupabaseUser } from '../auth/verifySupabaseUser';

export interface EmployerVerificationApiRequest {
  employerId: string;
  status: 'approved' | 'rejected';
}

export interface EmployerVerificationApiResponse {
  success: boolean;
  error?: string;
}

export async function handleEmployerVerificationRoute(
  reqBody: EmployerVerificationApiRequest,
  authorizationHeader: string | undefined
): Promise<EmployerVerificationApiResponse> {
  const caller = await verifySupabaseUser(authorizationHeader);
  if (!caller) {
    return { success: false, error: 'Authentification requise.' };
  }

  const { employerId, status } = reqBody;
  if (!employerId || (status !== 'approved' && status !== 'rejected')) {
    return { success: false, error: 'Requête invalide.' };
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

  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', caller.id).maybeSingle();
  if (callerProfile?.role !== 'admin') {
    return { success: false, error: 'Accès refusé.' };
  }

  const { data: target } = await admin.from('profiles').select('role, company_name').eq('id', employerId).maybeSingle();
  if (!target || !target.company_name) {
    return { success: false, error: "Ce profil n'est pas une candidature recruteur." };
  }

  const payload: Record<string, unknown> = {
    verification_status: status,
    account_status: status === 'approved' ? 'active' : 'suspended',
  };
  // Only ever promotes an existing job_seeker application to recruiter —
  // never touches an 'admin' row, even if an id were passed by mistake.
  if (status === 'approved' && target.role === 'job_seeker') {
    payload.role = 'recruiter';
  }

  const { error } = await admin.from('profiles').update(payload).eq('id', employerId);
  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
