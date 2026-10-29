/**
 * Infrastructure Layer: CVPilot plan <-> Stripe Price mapping
 *
 * Plan ids match profiles.plan values (see PLAN_INFO in UserSettingsModal.tsx)
 * and PricingPage.tsx's plan.id. Stripe Prices were created with a
 * `{planId}_{interval}` lookup_key so this code never hardcodes raw price IDs
 * (which differ between test and live mode).
 *
 * 'plus' was retired as a sellable tier (merged into 'pro' — see
 * PlanAccess.ts / entitlementService.ts) so it's intentionally absent here:
 * nothing checks out a 'plus' Price anymore.
 */

export type PlanId = 'pro' | 'max';
export type BillingInterval = 'month' | 'year';

export const PLAN_IDS: PlanId[] = ['pro', 'max'];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && (PLAN_IDS as string[]).includes(value);
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === 'month' || value === 'year';
}

export function priceLookupKey(planId: PlanId, interval: BillingInterval): string {
  return `${planId}_${interval}`;
}

export type DocumentType = 'cv' | 'cover_letter';
export type ExportFormat = 'pdf' | 'docx';

export const DOCUMENT_TYPES: DocumentType[] = ['cv', 'cover_letter'];

export function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === 'string' && (DOCUMENT_TYPES as string[]).includes(value);
}

export function isExportFormat(value: unknown): value is ExportFormat {
  return value === 'pdf' || value === 'docx';
}

// One-time purchase: a single 1.99€ bundle grants one CV credit AND one
// cover-letter credit together, instead of two separate per-document SKUs.
export const EXPORT_BUNDLE_LOOKUP_KEY = 'export_bundle_one_time';
