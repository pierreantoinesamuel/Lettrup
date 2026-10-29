/**
 * Value Object: Feature gating by subscription plan.
 *
 * profiles.plan defaults to 'free_trial' for every new signup (see
 * supabase_schema.sql) and is only ever changed server-side by the Stripe
 * webhook (src/infrastructure/routes/stripeWebhookApi.ts), which writes one
 * of PlanId from planCatalog.ts. Any other/unknown value (including a
 * legacy 'starter' from before that plan was retired) is treated as the
 * free tier here, never as elevated access.
 *
 * 'plus' was retired as a sellable tier (merged into 'pro') but is kept as
 * a recognized value ranked equal to 'pro' — a defensive alias so a stray
 * legacy row is never silently downgraded to the free tier.
 */
import type { DashboardTab } from '../../components/dashboard/Sidebar';

export type UserPlanId = 'free_trial' | 'pro' | 'plus' | 'max';

const PLAN_RANK: Record<UserPlanId, number> = {
  free_trial: 0,
  pro: 1,
  plus: 1,
  max: 2,
};

// Minimum plan required to open each dashboard tab. Tabs not listed default
// to the free tier (no gate).
const TAB_MIN_PLAN: Partial<Record<DashboardTab, UserPlanId>> = {
  'scan-history': 'pro',
  'jobs': 'pro',
  'linkedin': 'pro',
  'portfolio': 'pro',
  'interview': 'pro',
};

function rankOf(plan: string | null | undefined): number {
  return PLAN_RANK[plan as UserPlanId] ?? 0;
}

export function minPlanForTab(tab: DashboardTab): UserPlanId {
  return TAB_MIN_PLAN[tab] ?? 'free_trial';
}

export function canAccessTab(plan: string | null | undefined, tab: DashboardTab): boolean {
  return rankOf(plan) >= PLAN_RANK[minPlanForTab(tab)];
}
