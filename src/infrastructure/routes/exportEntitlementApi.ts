/**
 * Infrastructure Layer: API Route Handlers for the download-time export paywall
 * Routes: POST /api/export/check-entitlement, POST /api/export/consume-entitlement
 *
 * profiles.plan (subscription) is checked client-side straight from
 * AuthContext with no round trip for the Max tier — unlimited, already-paid,
 * nothing to protect server-side. Every other plan has a monthly download
 * quota (free_trial: 1 CV/month, no free cover letters; pro/plus: 10 of
 * each/month) enforced here via plan_export_usage (migration 017), on top
 * of the one-time-purchase path (export_entitlements) that existed before.
 */

import { getSupabaseAdminClient } from '../supabase/supabaseAdminClient';
import { verifySupabaseUser } from '../auth/verifySupabaseUser';
import { isDocumentType, isExportFormat, DocumentType } from '../stripe/planCatalog';
import { getUserPlan } from '../billing/entitlementService';

const PRO_MONTHLY_QUOTA = 10;
const FREE_MONTHLY_CV_QUOTA = 1;

// null = unlimited (no quota row ever checked/written). 0 = no free quota
// for this document type on this plan — always falls straight to the
// one-time-credit path. free_trial only gets a CV allowance: cover letters
// still require the 1.99€ pack or a subscription even on a first download.
async function getMonthlyQuotaLimit(userId: string, documentType: DocumentType): Promise<number | null> {
  const plan = await getUserPlan(userId);
  if (plan === 'max') return null;
  if (plan === 'pro' || plan === 'plus') return PRO_MONTHLY_QUOTA;
  if (plan === 'free_trial') return documentType === 'cv' ? FREE_MONTHLY_CV_QUOTA : 0;
  return 0;
}

export interface CheckExportEntitlementApiRequest {
  documentType: string;
}

export interface CheckExportEntitlementApiResponse {
  success: boolean;
  entitled: boolean;
  source?: 'subscription' | 'quota' | 'one_time';
  reason?: 'quota_exceeded' | 'no_subscription';
  /** Downloads already used this month and the monthly allowance, so the UI can warn before the limit. */
  used?: number;
  limit?: number;
  error?: string;
}

function currentPeriodKey(): string {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM', UTC calendar month
}

async function getQuotaUsed(userId: string, documentType: DocumentType): Promise<number> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from('plan_export_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('document_type', documentType)
    .eq('period_key', currentPeriodKey())
    .maybeSingle();
  return data?.count ?? 0;
}

async function findAvailableEntitlement(userId: string, documentType: DocumentType): Promise<string | null> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from('export_entitlements')
    .select('id')
    .eq('user_id', userId)
    .eq('document_type', documentType)
    .eq('status', 'available')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

export async function handleCheckExportEntitlementRoute(
  reqBody: CheckExportEntitlementApiRequest,
  authorizationHeader: string | undefined
): Promise<CheckExportEntitlementApiResponse> {
  const user = await verifySupabaseUser(authorizationHeader);
  if (!user) {
    return { success: false, entitled: false, error: 'Authentification requise.' };
  }
  if (!isDocumentType(reqBody.documentType)) {
    return { success: false, entitled: false, error: 'Type de document invalide.' };
  }

  try {
    const limit = await getMonthlyQuotaLimit(user.id, reqBody.documentType);

    if (limit === null) {
      return { success: true, entitled: true, source: 'subscription' };
    }

    if (limit > 0) {
      const used = await getQuotaUsed(user.id, reqBody.documentType);
      if (used < limit) {
        return { success: true, entitled: true, source: 'quota', used, limit };
      }
      const entitlementId = await findAvailableEntitlement(user.id, reqBody.documentType);
      if (entitlementId) {
        return { success: true, entitled: true, source: 'one_time', used, limit };
      }
      return { success: true, entitled: false, reason: 'quota_exceeded', used, limit };
    }

    const entitlementId = await findAvailableEntitlement(user.id, reqBody.documentType);
    if (entitlementId) {
      return { success: true, entitled: true, source: 'one_time' };
    }

    return { success: true, entitled: false, reason: 'no_subscription' };
  } catch (err: any) {
    console.error('[Export Entitlement] Check failed:', err.message);
    return { success: false, entitled: false, error: 'Une erreur est survenue.' };
  }
}

export interface ConsumeExportEntitlementApiRequest {
  documentType: string;
  format: string;
  documentId?: string;
}

export interface ConsumeExportEntitlementApiResponse {
  success: boolean;
  error?: string;
}

export async function handleConsumeExportEntitlementRoute(
  reqBody: ConsumeExportEntitlementApiRequest,
  authorizationHeader: string | undefined
): Promise<ConsumeExportEntitlementApiResponse> {
  const user = await verifySupabaseUser(authorizationHeader);
  if (!user) {
    return { success: false, error: 'Authentification requise.' };
  }
  if (!isDocumentType(reqBody.documentType) || !isExportFormat(reqBody.format)) {
    return { success: false, error: 'Requête invalide.' };
  }

  try {
    const limit = await getMonthlyQuotaLimit(user.id, reqBody.documentType);

    // Unlimited for Max subscribers — nothing to consume.
    if (limit === null) {
      return { success: true };
    }

    if (limit > 0) {
      const admin = getSupabaseAdminClient();
      const { data: incremented } = await admin.rpc('consume_plan_export_credit', {
        p_user_id: user.id,
        p_document_type: reqBody.documentType,
        p_period_key: currentPeriodKey(),
        p_limit: limit,
      });
      if (incremented) {
        return { success: true };
      }
      // Quota already exhausted this month — fall through to the
      // one-time-credit path below, same as a plan with no free quota.
    }

    const entitlementId = await findAvailableEntitlement(user.id, reqBody.documentType);
    if (!entitlementId) {
      return { success: false, error: 'Aucun crédit de téléchargement disponible.' };
    }

    const admin = getSupabaseAdminClient();
    // Guarded by `.eq('status', 'available')` so a concurrent consume call
    // for the same credit can't double-spend it — the second call's update
    // matches zero rows instead of re-consuming.
    const { data, error } = await admin
      .from('export_entitlements')
      .update({
        status: 'consumed',
        format_used: reqBody.format,
        document_id: reqBody.documentId || null,
        consumed_at: new Date().toISOString(),
      })
      .eq('id', entitlementId)
      .eq('status', 'available')
      .select('id')
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: 'Aucun crédit de téléchargement disponible.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Export Entitlement] Consume failed:', err.message);
    return { success: false, error: 'Une erreur est survenue.' };
  }
}
