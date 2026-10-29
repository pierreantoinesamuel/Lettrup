/**
 * Infrastructure Layer: API Route Handler for live Stripe pricing display
 * Route: GET /api/stripe/pricing-info
 *
 * ExportPaywallModal must show real, current prices instead of hardcoding
 * amounts that could drift from what Checkout actually charges — this reads
 * straight from Stripe by lookup_key so a Dashboard price change is
 * reflected without a code deploy.
 */

import { getStripeClient } from '../stripe/stripeClient';
import { EXPORT_BUNDLE_LOOKUP_KEY, priceLookupKey } from '../stripe/planCatalog';

export interface PriceDisplayInfo {
  amount: number;
  currency: string;
  interval?: string;
}

export interface PricingInfoApiResponse {
  success: boolean;
  subscriptionMonthly?: PriceDisplayInfo;
  maxMonthly?: PriceDisplayInfo;
  exportBundle?: PriceDisplayInfo;
  error?: string;
}

export async function handlePricingInfoRoute(): Promise<PricingInfoApiResponse> {
  try {
    const stripe = getStripeClient();

    const lookupKeys = [priceLookupKey('pro', 'month'), priceLookupKey('max', 'month'), EXPORT_BUNDLE_LOOKUP_KEY];

    const prices = await stripe.prices.list({ lookup_keys: lookupKeys, limit: lookupKeys.length });

    const byLookupKey = new Map(prices.data.map((price) => [price.lookup_key, price]));

    const toDisplayInfo = (lookupKey: string): PriceDisplayInfo | undefined => {
      const price = byLookupKey.get(lookupKey);
      if (!price || price.unit_amount === null) return undefined;
      return {
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
      };
    };

    return {
      success: true,
      subscriptionMonthly: toDisplayInfo(priceLookupKey('pro', 'month')),
      maxMonthly: toDisplayInfo(priceLookupKey('max', 'month')),
      exportBundle: toDisplayInfo(EXPORT_BUNDLE_LOOKUP_KEY),
    };
  } catch (err: any) {
    console.error('[Stripe Pricing Info] Failed to fetch prices:', err.message);
    return { success: false, error: 'Impossible de récupérer les tarifs.' };
  }
}
