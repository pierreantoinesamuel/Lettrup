import { handlePricingInfoRoute } from '../../../src/infrastructure/routes/stripePricingInfoApi';
import { applyEnv, jsonResponse, withRateLimit } from './_shared';

interface Context {
  request: Request;
  env: Record<string, string | undefined>;
}

export async function onRequestGet(context: Context): Promise<Response> {
  applyEnv(context.env);

  const rateLimited = await withRateLimit(context.request);
  if (rateLimited) return rateLimited;

  const result = await handlePricingInfoRoute();
  return jsonResponse(result, result.success ? 200 : 400);
}
