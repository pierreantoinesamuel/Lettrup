import { z } from 'zod';
import { getSupabaseAdminClient } from '../supabase/supabaseAdminClient';
import { verifySupabaseUser } from '../auth/verifySupabaseUser';

export const mutationSchema = z.object({
  action: z.enum(['account_status', 'candidate_profile', 'job_status', 'application_status']),
  targetId: z.string().uuid(),
  values: z.record(z.string(), z.unknown()).default({}),
});

export interface AdminMutationResponse { success: boolean; error?: string }

export async function handleAdminMutationRoute(body: unknown, authorizationHeader: string | undefined): Promise<AdminMutationResponse> {
  const caller = await verifySupabaseUser(authorizationHeader);
  if (!caller) return { success: false, error: 'Authentification requise.' };
  const parsed = mutationSchema.safeParse(body);
  if (!parsed.success) return { success: false, error: 'Requête invalide.' };

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return {
      success: false,
      error: 'Configuration serveur incomplète : SUPABASE_SERVICE_ROLE_KEY est manquante.',
    };
  }
  const { data: profile } = await admin.from('profiles').select('role, name').eq('id', caller.id).maybeSingle();
  if (profile?.role !== 'admin') return { success: false, error: 'Accès refusé.' };

  const { action, targetId, values } = parsed.data;
  let table: 'profiles' | 'jobs' | 'applications';
  let update: Record<string, unknown>;
  if (action === 'account_status') {
    table = 'profiles';
    update = { account_status: z.enum(['active', 'suspended', 'banned']).parse(values.status) };
  } else if (action === 'candidate_profile') {
    table = 'profiles';
    update = {};
    if (values.name !== undefined) update.name = z.string().trim().max(160).parse(values.name);
    if (values.role !== undefined) update.target_title = z.string().trim().max(160).parse(values.role);
    // 'plus' was retired as a sellable tier (merged into 'pro') — admins can
    // no longer assign it to an account, even though the DB/rank layer still
    // recognizes a legacy 'plus' row defensively.
    if (values.plan !== undefined) update.plan = z.enum(['free_trial', 'pro', 'max']).parse(values.plan);
    if (!Object.keys(update).length) return { success: false, error: 'Aucune modification.' };
  } else if (action === 'job_status') {
    table = 'jobs';
    update = { status: z.enum(['pending_review', 'active', 'rejected', 'suspended', 'filled']).parse(values.status) };
    if (values.flag_status !== undefined) update.flag_status = z.enum(['normal', 'suspicious', 'spam']).parse(values.flag_status);
    if (values.flag_reason !== undefined) update.flag_reason = z.string().trim().max(1000).nullable().parse(values.flag_reason);
  } else {
    table = 'applications';
    update = { status: z.enum(['pending', 'auto_rejected', 'under_review', 'shortlisted', 'rejected', 'hired']).parse(values.status), review_status: 'overridden', auto_rejected: false };
  }

  const { error } = await admin.from(table).update(update).eq('id', targetId);
  if (error) return { success: false, error: 'La mise à jour a échoué.' };
  await admin.from('admin_audit_log').insert({ admin_id: caller.id, admin_name: profile.name || caller.email, admin_role: 'admin', action_type: action, target_type: table, target_id: targetId, notes: JSON.stringify(update) });
  return { success: true };
}
