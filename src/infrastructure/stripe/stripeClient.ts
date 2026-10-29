/**
 * Infrastructure Layer: Stripe client singleton (server-only)
 *
 * STRIPE_SECRET_KEY must never reach the browser bundle — only import this
 * from server.ts / src/infrastructure/routes/*, never from client code.
 */

import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  stripeInstance = new Stripe(apiKey);
  return stripeInstance;
}
