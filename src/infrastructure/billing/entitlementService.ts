import { getSupabaseAdminClient } from '../supabase/supabaseAdminClient';

// 'plus' was retired as a sellable tier (merged into 'pro') but stays a
// recognized value ranked equal to 'pro' below — a defensive alias so a
// stray legacy row is never silently downgraded to the free tier.
export type ActivePlan = 'pro' | 'plus' | 'max';
export type AccountPlan = 'free_trial' | ActivePlan;

const ACTIVE_PLANS: readonly ActivePlan[] = ['pro', 'plus', 'max'];

export function isActivePlan(value: unknown): value is ActivePlan {
  return typeof value === 'string' && ACTIVE_PLANS.includes(value as ActivePlan);
}

export function isKnownPlan(value: unknown): value is AccountPlan {
  return value === 'free_trial' || isActivePlan(value);
}

export function hasMinimumPlan(plan: unknown, minimum: AccountPlan): boolean {
  const rank: Record<AccountPlan, number> = { free_trial: 0, pro: 1, plus: 1, max: 2 };
  return isKnownPlan(plan) && rank[plan] >= rank[minimum];
}

export async function getUserPlan(userId: string): Promise<AccountPlan | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from('profiles')
    .select('plan, subscription_status, current_period_end')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data || !isKnownPlan(data.plan)) return null;
  if (data.plan !== 'free_trial' && data.subscription_status && data.subscription_status !== 'active') return 'free_trial';
  if (data.plan !== 'free_trial' && data.current_period_end && new Date(data.current_period_end).getTime() <= Date.now()) return 'free_trial';
  return data.plan;
}

export async function requireMinimumPlan(userId: string, minimum: AccountPlan): Promise<boolean> {
  const plan = await getUserPlan(userId);
  return hasMinimumPlan(plan, minimum);
}