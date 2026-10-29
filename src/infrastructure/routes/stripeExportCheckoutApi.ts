/**
 * Infrastructure Layer: API Route Handler for one-time export Checkout Sessions
 * Route: POST /api/stripe/create-export-checkout-session
 *
 * mode: 'payment' (not 'subscription') — a single flat-rate bundle (1.99€)
 * that grants both a CV credit and a cover-letter credit via the webhook
 * once payment completes, instead of a recurring plan. There's no per-type
 * price to resolve from client input anymore, so nothing can be forced from
 * the frontend.
 */

import { getStripeClient } from '../stripe/stripeClient';
import { verifySupabaseUser } from '../auth/verifySupabaseUser';
import { EXPORT_BUNDLE_LOOKUP_KEY } from '../stripe/planCatalog';

import { SITE_URL } from '../../config/brand';
export interface CreateExportCheckoutSessionApiResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export async function handleCreateExportCheckoutSessionRoute(
  authorizationHeader: string | undefined
): Promise<CreateExportCheckoutSessionApiResponse> {
  const user = await verifySupabaseUser(authorizationHeader);
  if (!user) {
    return { success: false, error: 'Authentification requise.' };
  }

  const appUrl = process.env.APP_URL || SITE_URL;

  try {
    const stripe = getStripeClient();
    const prices = await stripe.prices.list({ lookup_keys: [EXPORT_BUNDLE_LOOKUP_KEY], limit: 1 });
    const price = prices.data[0];
    if (!price) {
      return { success: false, error: 'Ce pack n\'est pas disponible pour le moment.' };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${appUrl}/dashboard?export_checkout=success`,
      cancel_url: `${appUrl}/dashboard?export_checkout=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        purchase_type: 'one_time_export_bundle',
      },
    });

    return { success: true, url: session.url || undefined };
  } catch (err: any) {
    console.error('[Stripe Export Checkout] Failed to create session:', err.message);
    return { success: false, error: 'Impossible de démarrer le paiement. Réessayez dans un instant.' };
  }
}
