/**
 * Infrastructure Layer: API Route Handler for Stripe webhooks
 * Route: POST /api/stripe/webhook
 *
 * Server.ts registers this route with express.raw() (before the global
 * express.json() middleware) because signature verification needs the exact
 * raw request bytes Stripe signed — a parsed/re-serialized body will fail
 * `stripe.webhooks.constructEvent`.
 *
 * profiles.plan is the only entitlement field the rest of the app reads
 * (Sidebar, UserSettingsModal, admin panels); everything else here just
 * keeps the stripe_* columns in sync for the checkout/portal routes and for
 * support debugging.
 */

import type Stripe from 'stripe';
import { getStripeClient } from '../stripe/stripeClient';
import { getSupabaseAdminClient } from '../supabase/supabaseAdminClient';
import { DocumentType } from '../stripe/planCatalog';

export interface WebhookHandleResult {
  received: boolean;
  error?: string;
}

async function resolveCustomerId(subscription: Stripe.Subscription): Promise<string> {
  return typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
}

// Stripe fires customer.subscription.updated on every status transition,
// including ones caused by a failed recurring charge (active -> past_due,
// and eventually -> unpaid or canceled once retries are exhausted, per the
// Dashboard's "manage failed payments" setting). Whether that final status
// is reached via customer.subscription.deleted depends on that same Stripe
// account setting — some configurations leave the subscription resource
// alive but "unpaid" instead of deleting it, so waiting for a deleted event
// alone is not sufficient. Only these two statuses represent a subscription
// actually being paid for right now; anything else must not keep granting
// paid access indefinitely on a lapsed card.
const ENTITLING_SUBSCRIPTION_STATUSES: Stripe.Subscription.Status[] = ['active', 'trialing'];

async function upsertProfileFromSubscription(subscription: Stripe.Subscription, fallbackUserId?: string): Promise<void> {
  const stripe = getStripeClient();
  const admin = getSupabaseAdminClient();

  const customerId = await resolveCustomerId(subscription);
  const item = subscription.items.data[0];
  if (!item) {
    console.error('[Stripe Webhook] Subscription has no items:', subscription.id);
    return;
  }

  const price = typeof item.price === 'string' ? await stripe.prices.retrieve(item.price) : item.price;
  // Price-level metadata is the source of truth for which tier a price
  // represents (stays correct across a customer-portal upgrade/downgrade to
  // a different price), but it has to be set by hand on each Stripe Price in
  // the Dashboard and is easy to forget when a new price is created — fall
  // back to the subscription's own metadata, which handleCreateCheckoutSessionRoute
  // always sets programmatically via subscription_data.metadata, so a missing
  // Dashboard entry doesn't silently strand a paying customer without their plan.
  const planId = price.metadata?.plan_id || subscription.metadata?.plan_id;
  const billingInterval = price.metadata?.billing_interval || subscription.metadata?.billing_interval;

  if (!planId) {
    console.error('[Stripe Webhook] Price is missing plan_id metadata, cannot sync plan:', price.id);
    return;
  }

  // Match by stripe_customer_id first (works for renewals, portal-driven
  // upgrades/downgrades); fall back to the Checkout Session's
  // client_reference_id the very first time, before it's been saved.
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  const targetUserId = existing?.id || fallbackUserId;
  if (!targetUserId) {
    console.error('[Stripe Webhook] Could not resolve a profile for Stripe customer:', customerId);
    return;
  }

  // A past_due/unpaid/incomplete subscription must not keep the paid plan
  // active — fall back to the same 'free_trial' value handleSubscriptionDeleted
  // uses, so a lapsed card degrades access the same way an actually-deleted
  // subscription does, instead of relying solely on the deleted event ever firing.
  const grantedPlan = ENTITLING_SUBSCRIPTION_STATUSES.includes(subscription.status) ? planId : 'free_trial';

  const { error } = await admin
    .from('profiles')
    .update({
      plan: grantedPlan,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: price.id,
      billing_interval: billingInterval || null,
      subscription_status: subscription.status,
      current_period_end: new Date(item.current_period_end * 1000).toISOString(),
    })
    .eq('id', targetUserId);

  if (error) {
    console.error('[Stripe Webhook] Failed to update profile', targetUserId, error.message);
  }
}

// The 1.99€ one-time purchase is a single bundle: it always grants a CV
// credit AND a cover-letter credit together, so this inserts two rows from
// one Checkout session — allowed by the (session_id, document_type)
// composite unique constraint added in migration 017 (was a plain
// per-session unique before, back when purchases were per-document).
async function grantExportEntitlement(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.supabase_user_id || session.client_reference_id;

  if (!userId) {
    console.error('[Stripe Webhook] One-time export session missing user reference:', session.id);
    return;
  }

  const admin = getSupabaseAdminClient();
  const bundleDocumentTypes: DocumentType[] = ['cv', 'cover_letter'];
  const { error } = await admin.from('export_entitlements').insert(
    bundleDocumentTypes.map((documentType) => ({
      user_id: userId,
      document_type: documentType,
      status: 'available',
      stripe_checkout_session_id: session.id,
    }))
  );

  if (error) {
    // Unique violation on (session_id, document_type) means this event was
    // already processed (Stripe retries webhooks) — not a real failure.
    if (error.code !== '23505') {
      console.error('[Stripe Webhook] Failed to grant export entitlement', session.id, error.message);
    }
  }
}

async function handleSetupSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.supabase_user_id || session.client_reference_id;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

  if (!userId || !customerId) {
    console.error('[Stripe Webhook] Setup session missing user/customer reference:', session.id);
    return;
  }

  const stripe = getStripeClient();
  const admin = getSupabaseAdminClient();

  const setupIntentId = typeof session.setup_intent === 'string' ? session.setup_intent : session.setup_intent?.id;
  const setupIntent = setupIntentId ? await stripe.setupIntents.retrieve(setupIntentId) : null;
  const paymentMethodId =
    typeof setupIntent?.payment_method === 'string' ? setupIntent.payment_method : setupIntent?.payment_method?.id;

  if (paymentMethodId) {
    // Make it the default so a later subscription/invoice picks it up automatically.
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  }

  const { error } = await admin
    .from('profiles')
    .update({
      stripe_customer_id: customerId,
      has_payment_method: true,
      stripe_payment_method_id: paymentMethodId || null,
    })
    .eq('id', userId);

  if (error) {
    console.error('[Stripe Webhook] Failed to save payment method on profile', userId, error.message);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const admin = getSupabaseAdminClient();
  const customerId = await resolveCustomerId(subscription);

  const { error } = await admin
    .from('profiles')
    .update({
      plan: 'free_trial',
      stripe_subscription_id: null,
      stripe_price_id: null,
      billing_interval: null,
      subscription_status: 'canceled',
      current_period_end: null,
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('[Stripe Webhook] Failed to downgrade cancelled subscription', customerId, error.message);
  }
}

export async function handleStripeWebhookRoute(
  rawBody: Buffer | string,
  signature: string | undefined,
  // Node (server.ts) leaves this undefined and gets Stripe's default,
  // Node-crypto-backed sync verification. Cloudflare Pages Functions run on
  // the Workers runtime (no Node `crypto`), so they pass
  // Stripe.createSubtleCryptoProvider() here to use the async Web Crypto
  // verification path instead — Stripe's documented pattern for edge runtimes.
  cryptoProvider?: Stripe.CryptoProvider
): Promise<WebhookHandleResult> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not configured');
    return { received: false, error: 'Webhook not configured' };
  }
  if (!signature) {
    return { received: false, error: 'Missing stripe-signature header' };
  }

  const stripe = getStripeClient();
  let event: Stripe.Event;
  try {
    event = cryptoProvider
      ? await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret, undefined, cryptoProvider)
      : stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return { received: false, error: 'Invalid signature' };
  }

  const admin = getSupabaseAdminClient();
  const { data: existingEvent } = await admin
    .from('stripe_webhook_events')
    .select('processed_at')
    .eq('event_id', event.id)
    .maybeSingle();
  if (existingEvent?.processed_at) return { received: true };

  const { error: eventInsertError } = await admin.from('stripe_webhook_events').upsert({
    event_id: event.id,
    event_type: event.type,
  }, { onConflict: 'event_id', ignoreDuplicates: true });
  if (eventInsertError) return { received: false, error: 'Webhook idempotency check failed; retry required.' };

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertProfileFromSubscription(subscription, session.client_reference_id || undefined);
        } else if (session.mode === 'payment' && session.metadata?.purchase_type === 'one_time_export_bundle') {
          await grantExportEntitlement(session);
        } else if (session.mode === 'setup') {
          await handleSetupSessionCompleted(session);
        }
        break;
      }
      case 'customer.subscription.updated': {
        await upsertProfileFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch (err: any) {
    console.error(`[Stripe Webhook] Unhandled error processing ${event.type}:`, err.message);
    await admin.from('stripe_webhook_events').update({ processing_error: err.message }).eq('event_id', event.id);
    return { received: false, error: 'Webhook processing failed; retry required.' };
  }

  await admin.from('stripe_webhook_events').update({ processed_at: new Date().toISOString(), processing_error: null }).eq('event_id', event.id);

  return { received: true };
}
