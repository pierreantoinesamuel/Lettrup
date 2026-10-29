/**
 * Application Service: monthly AI cost budget per user.
 *
 * Rule: what a user costs in AI calls must never exceed 20% of what they pay
 * for the month. So:
 *   - Pro  (9.99€/month)  -> 2.00€ of AI per month
 *   - Max  (39€/month)    -> 7.80€
 *   - no subscription     -> 20% of the one-time 1.99€ pack = 0.40€, so a
 *     visitor who never pays still costs less than what a single buyer brings.
 *
 * Spend is read from `pipeline_runs` (one row per AI run, `tokens_used` =
 * estimated total tokens) and priced at a deliberately pessimistic blended
 * rate, so the estimate errs on the side of stopping early. Both the rate and
 * the plan prices can be overridden by environment variables.
 */

import { getSupabaseAdminClient } from '../../infrastructure/supabase/supabaseAdminClient';
import { getUserPlan } from '../../infrastructure/billing/entitlementService';

export const AI_COST_SHARE = 0.2;

const PLAN_MONTHLY_PRICE_EUR: Record<string, number> = {
  pro: Number(process.env.PLAN_PRO_PRICE_EUR) || 9.99,
  plus: Number(process.env.PLAN_PRO_PRICE_EUR) || 9.99,
  max: Number(process.env.PLAN_MAX_PRICE_EUR) || 39,
};

const ONE_TIME_PACK_PRICE_EUR = Number(process.env.EXPORT_PACK_PRICE_EUR) || 1.99;

// Blended euros per million tokens (input and output mixed). The default is
// pessimistic for a Sonnet-class model; set AI_COST_EUR_PER_MTOK to your real
// figure once you know it.
const BLENDED_EUR_PER_MTOK = Number(process.env.AI_COST_EUR_PER_MTOK) || 10;

/** Rough token count from text length: ~3.2 characters per token for French. */
export function estimateTokens(...texts: Array<string | undefined>): number {
  const chars = texts.reduce((sum, t) => sum + (t ? t.length : 0), 0);
  return Math.ceil(chars / 3.2);
}

export function tokensToEur(tokens: number): number {
  return (tokens / 1_000_000) * BLENDED_EUR_PER_MTOK;
}

export function monthlyBudgetEur(plan: string | null | undefined): number {
  const price = (plan && PLAN_MONTHLY_PRICE_EUR[plan]) || ONE_TIME_PACK_PRICE_EUR;
  return price * AI_COST_SHARE;
}

function startOfMonthUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function nextResetDateLabel(now = new Date()): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
}

export interface AiBudgetStatus {
  allowed: boolean;
  plan: string | null;
  budgetEur: number;
  spentEur: number;
  /** The call that was refused would have needed this much. */
  neededEur: number;
}

async function spentThisMonthEur(userId: string): Promise<number> {
  const { data } = await getSupabaseAdminClient()
    .from('pipeline_runs')
    .select('tokens_used')
    .eq('user_id', userId)
    .gte('created_at', startOfMonthUtc().toISOString())
    .limit(2000);
  const tokens = (data || []).reduce((sum: number, row: { tokens_used: number | null }) => sum + (row.tokens_used || 0), 0);
  return tokensToEur(tokens);
}

/**
 * Checks whether a run expected to use `expectedTokens` still fits in the
 * user's budget for the month. Fails closed: if the spend can't be read, the
 * run is refused rather than allowed unmetered.
 */
export async function checkAiBudget(userId: string, expectedTokens: number): Promise<AiBudgetStatus> {
  const plan = await getUserPlan(userId).catch(() => null);
  const budgetEur = monthlyBudgetEur(plan);
  const neededEur = tokensToEur(expectedTokens);
  try {
    const spentEur = await spentThisMonthEur(userId);
    return { allowed: spentEur + neededEur <= budgetEur, plan, budgetEur, spentEur, neededEur };
  } catch (err: any) {
    console.error('[AiBudget] Could not read monthly spend:', err?.message);
    return { allowed: false, plan, budgetEur, spentEur: budgetEur, neededEur };
  }
}

/** Records one AI run so the next budget check sees it. Failures are logged loudly: a missed row means unmetered spend. */
export async function recordAiRun(input: {
  userId: string;
  cvId?: string;
  task: string;
  tokens: number;
  success: boolean;
  durationMs: number;
  error?: string;
}): Promise<void> {
  const { error } = await getSupabaseAdminClient().from('pipeline_runs').insert({
    user_id: input.userId,
    cv_id: input.cvId ?? null,
    task: input.task,
    tokens_used: Math.round(input.tokens),
    success: input.success,
    duration_ms: Math.round(input.durationMs),
    error: input.error ?? null,
  });
  if (error) console.error('[AiBudget] Failed to record AI run — spend is not being metered:', error.message);
}
