/**
 * Infrastructure Layer: API Route Handler for Stripe Checkout Session creation
 * Route: POST /api/stripe/create-checkout-session
 *
 * Mirrors the flat-rate subscription pattern from the Stripe implementation
 * planner: hosted Checkout Session in `mode: 'subscription'`, no Stripe-level
 * trial (CVPilot's free_trial is tracked entirely in profiles.plan /
 * trial_expires_at, independent of Stripe — see migration 012).
 */

import { getStripeClient } from '../stripe/stripeClient';
import { getSupabaseAdminClient } from '../supabase/supabaseAdminClient';
import { verifySupabaseUser } from '../auth/verifySupabaseUser';
import { isBillingInterval, isPlanId, priceLookupKey } from '../stripe/planCatalog';

import { SITE_URL } from '../../config/brand';
export interface CreateCheckoutSessionApiRequest {
  planId: string;
  interval: string;
  successPath?: string;
  cancelPath?: string;
}

export interface CreateCheckoutSessionApiResponse {
  success: boolean;
  url?: string;
  error?: string;
}

function safeCheckoutRedirectPath(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(value, 'https://cvpilot.local');
  } catch {
    return fallback;
  }

  const isAllowedPath = parsed.pathname === '/dashboard' || parsed.pathname === '/pricing';
  return isAllowedPath ? `${parsed.pathname}${parsed.search}` : fallback;
}

export async function handleCreateCheckoutSessionRoute(
  reqBody: CreateCheckoutSessionApiRequest,
  authorizationHeader: string | undefined
): Promise<CreateCheckoutSessionApiResponse> {
  const user = await verifySupabaseUser(authorizationHeader);
  if (!user) {
    return { success: false, error: 'Authentification requise.' };
  }

  if (!isPlanId(reqBody.planId) || !isBillingInterval(reqBody.interval)) {
    return { success: false, error: 'Formule ou cycle de facturation invalide.' };
  }

  const appUrl = process.env.APP_URL || SITE_URL;
  const successPath = safeCheckoutRedirectPath(
    reqBody.successPath,
    `/dashboard?checkout=success&plan=${encodeURIComponent(reqBody.planId)}`
  );
  const cancelPath = safeCheckoutRedirectPath(
    reqBody.cancelPath,
    `/pricing?checkout=cancelled&plan=${encodeURIComponent(reqBody.planId)}`
  );

  try {
    const stripe = getStripeClient();
    const admin = getSupabaseAdminClient();

    const lookupKey = priceLookupKey(reqBody.planId, reqBody.interval);
    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
    const price = prices.data[0];
    if (!price) {
      return { success: false, error: 'Cette formule n\'est pas disponible pour le moment.' };
    }

    // Reuse the existing Stripe customer if this profile already has one
    // (e.g. a lapsed subscriber resubscribing) to avoid duplicate customers.
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    const existingCustomerId = profile?.stripe_customer_id as string | null | undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: existingCustomerId || undefined,
      customer_email: existingCustomerId ? undefined : user.email,
      client_reference_id: user.id,
      line_items: [{ price: price.id, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl}${successPath}`,
      cancel_url: `${appUrl}${cancelPath}`,
      metadata: {
        supabase_user_id: user.id,
        plan_id: reqBody.planId,
        billing_interval: reqBody.interval,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_id: reqBody.planId,
          billing_interval: reqBody.interval,
        },
      },
    });

    return { success: true, url: session.url || undefined };
  } catch (err: any) {
    console.error('[Stripe Checkout] Failed to create session:', err.message);
    return { success: false, error: 'Impossible de démarrer le paiement. Réessayez dans un instant.' };
  }
}
