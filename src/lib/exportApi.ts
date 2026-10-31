import { supabase } from './supabase';

async function getAuthHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type DocumentType = 'cv' | 'cover_letter';
export type ExportFormat = 'pdf' | 'docx';

export interface PriceDisplayInfo {
  amount: number;
  currency: string;
  interval?: string;
}

export interface PricingInfo {
  subscriptionMonthly?: PriceDisplayInfo;
  maxMonthly?: PriceDisplayInfo;
  exportBundle?: PriceDisplayInfo;
}

export function formatPrice(info: PriceDisplayInfo | undefined): string | null {
  if (!info) return null;
  const amount = (info.amount / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const currencySymbol = info.currency.toLowerCase() === 'eur' ? '€' : info.currency.toUpperCase();
  return `${amount} ${currencySymbol}`;
}

export async function fetchPricingInfo(): Promise<PricingInfo> {
  try {
    const res = await fetch('/api/stripe/pricing-info');
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

export async function checkExportEntitlement(
  documentType: DocumentType
): Promise<{
  entitled: boolean;
  source?: 'subscription' | 'quota' | 'one_time';
  reason?: 'quota_exceeded' | 'no_subscription';
  /** true when the server could not be asked (down, route missing, error): not the same as "not entitled". */
  failed?: boolean;
  /** Downloads used this month and the monthly allowance (absent for unlimited plans). */
  used?: number;
  limit?: number;
}> {
  const headers = await getAuthHeader();
  if (!headers.Authorization) return { entitled: false };

  try {
    const res = await fetch('/api/export/check-entitlement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ documentType }),
    });
    const data = await res.json();
    if (!res.ok || data.success === false) return { entitled: false, failed: true };
    return { entitled: !!data.entitled, source: data.source, reason: data.reason, used: data.used, limit: data.limit };
  } catch {
    return { entitled: false, failed: true };
  }
}

export async function consumeExportEntitlement(
  documentType: DocumentType,
  format: ExportFormat,
  documentId?: string
): Promise<{ success: boolean }> {
  const headers = await getAuthHeader();
  if (!headers.Authorization) return { success: false };

  try {
    const res = await fetch('/api/export/consume-entitlement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ documentType, format, documentId }),
    });
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}

// documentType is accepted only to tag which flow triggered the purchase
// (analytics) — the bundle purchase always grants both a CV and a
// cover-letter credit regardless of which one the user was trying to
// download when the paywall appeared.
export async function startExportCheckout(_documentType: DocumentType): Promise<{ error: string | null }> {
  const headers = await getAuthHeader();
  if (!headers.Authorization) return { error: 'not_authenticated' };

  const res = await fetch('/api/stripe/create-export-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  const data = await res.json();

  if (!res.ok || !data.url) {
    return { error: data.error || 'Une erreur est survenue.' };
  }

  window.location.href = data.url;
  return { error: null };
}
