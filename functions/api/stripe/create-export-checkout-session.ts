import { handleCreateExportCheckoutSessionRoute } from '../../../src/infrastructure/routes/stripeExportCheckoutApi';
import { applyEnv, authHeader, jsonResponse, withRateLimit } from './_shared';

interface Context {
  request: Request;
  env: Record<string, string | undefined>;
}

export async function onRequestPost(context: Context): Promise<Response> {
  applyEnv(context.env);

  const rateLimited = await withRateLimit(context.request);
  if (rateLimited) return rateLimited;

  const result = await handleCreateExportCheckoutSessionRoute(authHeader(context.request));
  return jsonResponse(result, result.success ? 200 : 400);
}
