import type { DashboardTab } from '../components/dashboard/Sidebar';

export type CheckoutPlanId = 'pro' | 'max';
export type CheckoutBillingInterval = 'month' | 'year';

export interface CheckoutIntent {
  planId: CheckoutPlanId;
  interval: CheckoutBillingInterval;
  featureTab?: DashboardTab;
}

const STORAGE_KEY = 'cvpilot_pending_checkout';
const PLAN_IDS = new Set(['pro', 'max']);
const INTERVALS = new Set(['month', 'year']);

export function isCheckoutPlanId(value: unknown): value is CheckoutPlanId {
  return typeof value === 'string' && PLAN_IDS.has(value);
}

export function isCheckoutBillingInterval(value: unknown): value is CheckoutBillingInterval {
  return typeof value === 'string' && INTERVALS.has(value);
}

export function getPendingCheckoutIntent(): CheckoutIntent | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutIntent>;
    if (!isCheckoutPlanId(parsed.planId) || !isCheckoutBillingInterval(parsed.interval)) return null;
    return {
      planId: parsed.planId,
      interval: parsed.interval,
      featureTab: parsed.featureTab,
    };
  } catch {
    return null;
  }
}

export function savePendingCheckoutIntent(intent: CheckoutIntent): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
}

export function clearPendingCheckoutIntent(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function buildCheckoutSuccessPath(intent: CheckoutIntent): string {
  const params = new URLSearchParams({ checkout: 'success', plan: intent.planId });
  if (intent.featureTab) params.set('tab', intent.featureTab);
  return `/dashboard?${params.toString()}`;
}

export function buildCheckoutCancelPath(intent: CheckoutIntent): string {
  const params = new URLSearchParams({ checkout: 'cancelled', plan: intent.planId });
  if (intent.featureTab) params.set('feature', intent.featureTab);
  return `/pricing?${params.toString()}`;
}
