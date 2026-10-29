/**
 * Infrastructure Layer: API Route Handler for saving a payment method without charging
 * Route: POST /api/stripe/create-setup-session
 *
 * Lets a free_trial user register a card ahead of subscribing, via a Stripe
 * Checkout Session in `mode: 'setup'` — collects and attaches a payment
 * method to their Stripe customer with no charge. The resulting
 * `checkout.session.completed` webhook event (session.mode === 'setup') is
 * what actually writes has_payment_method / stripe_payment_method_id.
 */

import { getStripeClient } from '../stripe/stripeClient';
import { getSupabaseAdminClient } from '../supabase/supabaseAdminClient';
import { verifySupabaseUser } from '../auth/verifySupabaseUser';

import { SITE_URL } from '../../config/brand';
export interface CreateSetupSessionApiResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export async function handleCreateSetupSessionRoute(
  authorizationHeader: string | undefined
): Promise<CreateSetupSessionApiResponse> {
  const user = await verifySupabaseUser(authorizationHeader);
  if (!user) {
    return { success: false, error: 'Authentification requise.' };
  }

  const appUrl = process.env.APP_URL || SITE_URL;

  try {
    const stripe = getStripeClient();
    const admin = getSupabaseAdminClient();

    // Reuse the existing Stripe customer if this profile already has one,
    // same pattern as stripeCheckoutApi.ts, to avoid duplicate customers.
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    const existingCustomerId = profile?.stripe_customer_id as string | null | undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: existingCustomerId || undefined,
      customer_email: existingCustomerId ? undefined : user.email,
      client_reference_id: user.id,
      success_url: `${appUrl}/dashboard?setup=success`,
      cancel_url: `${appUrl}/dashboard?setup=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        purpose: 'save_payment_method',
      },
    });

    return { success: true, url: session.url || undefined };
  } catch (err: any) {
    console.error('[Stripe Setup] Failed to create session:', err.message);
    return { success: false, error: 'Impossible d\'enregistrer votre carte. Réessayez dans un instant.' };
  }
}
