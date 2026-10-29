import Stripe from 'stripe';
import { handleStripeWebhookRoute } from '../../../src/infrastructure/routes/stripeWebhookApi';
import { applyEnv, jsonResponse } from './_shared';

interface Context {
  request: Request;
  env: Record<string, string | undefined>;
}

// No rate limiting here — mirrors server.ts, which registers this route
// before rateLimitMiddleware is applied to anything else.
export async function onRequestPost(context: Context): Promise<Response> {
  applyEnv(context.env);

  // Signature verification needs the exact raw bytes Stripe signed, so this
  // reads the body as text rather than parsing it as JSON.
  const rawBody = await context.request.text();
  const signature = context.request.headers.get('stripe-signature') || undefined;

  // Workers has no Node `crypto`, so verification goes through Stripe's
  // async Web Crypto provider instead of the sync default (see
  // handleStripeWebhookRoute's cryptoProvider param).
  const result = await handleStripeWebhookRoute(rawBody, signature, Stripe.createSubtleCryptoProvider());
  return jsonResponse(result, result.received ? 200 : 400);
}
