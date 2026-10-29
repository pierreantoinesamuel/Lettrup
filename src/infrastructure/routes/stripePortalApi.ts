/**
 * Infrastructure Layer: API Route Handler for Stripe Customer Portal sessions
 * Route: POST /api/stripe/create-portal-session
 *
 * Self-service subscription management (upgrade/downgrade/cancel, payment
 * method updates, invoice history) — the Stripe-hosted Customer Portal,
 * per the Stripe implementation planner's default recommendation.
 */

import { getStripeClient } from '../stripe/stripeClient';
import { getSupabaseAdminClient } from '../supabase/supabaseAdminClient';
import { verifySupabaseUser } from '../auth/verifySupabaseUser';

import { SITE_URL } from '../../config/brand';
export interface CreatePortalSessionApiResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export async function handleCreatePortalSessionRoute(
  authorizationHeader: string | undefined
): Promise<CreatePortalSessionApiResponse> {
  const user = await verifySupabaseUser(authorizationHeader);
  if (!user) {
    return { success: false, error: 'Authentification requise.' };
  }

  const appUrl = process.env.APP_URL || SITE_URL;

  try {
    const admin = getSupabaseAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    const customerId = profile?.stripe_customer_id as string | null | undefined;
    if (!customerId) {
      return { success: false, error: 'Aucun abonnement actif à gérer.' };
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard`,
    });

    return { success: true, url: session.url };
  } catch (err: any) {
    console.error('[Stripe Portal] Failed to create session:', err.message);
    return { success: false, error: 'Impossible d\'ouvrir la gestion de facturation. Réessayez dans un instant.' };
  }
}
