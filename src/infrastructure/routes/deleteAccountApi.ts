/**
 * Infrastructure Layer: API Route Handler for account deletion (RGPD "droit à l'oubli")
 * Route: POST /api/account/delete
 *
 * Deleting the auth.users row requires the service-role key, which must
 * never live in the browser — this is the server-side counterpart to
 * AuthContext.deleteAccount(). Every user-owned table references either
 * profiles.id or auth.users.id with ON DELETE CASCADE (verified against
 * pg_constraint directly — information_schema.constraint_column_usage
 * silently omits some of the auth.users FKs on this project, so it
 * under-reports), so admin.auth.admin.deleteUser() alone removes them all.
 * ai_usage_ledger, ai_user_monthly_spend and export_entitlements are
 * deleted explicitly below too — redundant with their own CASCADE to
 * auth.users, but kept as defense-in-depth in case that FK is ever
 * changed. Two real exceptions need explicit handling:
 *  - applications.applicant_id is ON DELETE SET NULL, not CASCADE (an
 *    employer's application record should survive a candidate deleting
 *    their account) — but the row also carries direct PII copies
 *    (applicant_name, email, resume_preview_json) that cascade wouldn't
 *    touch anyway, so those must be scrubbed explicitly or they'd persist
 *    indefinitely under a null-owner row (RGPD Art. 17 gap).
 *  - admin_audit_log.admin_id is ON DELETE NO ACTION (not SET NULL or
 *    CASCADE) — an admin/super-admin who has ever logged an action
 *    (approve/suspend/ban via the admin panel) would otherwise hit a
 *    Postgres FK-violation and be unable to delete their own account at
 *    all. admin_name/admin_role are denormalized text columns already
 *    captured at insert time, so nulling admin_id keeps the audit trail
 *    readable without needing the row to still exist.
 */

import { getSupabaseAdminClient } from '../supabase/supabaseAdminClient';
import { verifySupabaseUser } from '../auth/verifySupabaseUser';

export interface DeleteAccountApiResponse {
  success: boolean;
  error?: string;
}

const NO_FK_USER_TABLES = ['ai_usage_ledger', 'ai_user_monthly_spend', 'export_entitlements'];

export async function handleDeleteAccountRoute(
  authorizationHeader: string | undefined
): Promise<DeleteAccountApiResponse> {
  const caller = await verifySupabaseUser(authorizationHeader);
  if (!caller) {
    return { success: false, error: 'Authentification requise.' };
  }

  const admin = getSupabaseAdminClient();

  for (const table of NO_FK_USER_TABLES) {
    const { error } = await admin.from(table).delete().eq('user_id', caller.id);
    if (error) {
      return { success: false, error: error.message };
    }
  }

  // Scrub PII from job applications before the account row disappears —
  // applicant_id will be nulled by the FK's ON DELETE SET NULL, but the
  // name/email/resume snapshot columns would otherwise survive untouched.
  const { error: applicationsError } = await admin
    .from('applications')
    .update({ applicant_name: null, email: null, resume_preview_json: null })
    .eq('applicant_id', caller.id);
  if (applicationsError) {
    return { success: false, error: applicationsError.message };
  }

  const { error: auditLogError } = await admin
    .from('admin_audit_log')
    .update({ admin_id: null })
    .eq('admin_id', caller.id);
  if (auditLogError) {
    return { success: false, error: auditLogError.message };
  }

  const { error } = await admin.auth.admin.deleteUser(caller.id);
  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
