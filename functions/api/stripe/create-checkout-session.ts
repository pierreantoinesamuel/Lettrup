import { handleCreateCheckoutSessionRoute, type CreateCheckoutSessionApiRequest } from '../../../src/infrastructure/routes/stripeCheckoutApi';
import { applyEnv, authHeader, jsonResponse, readJsonBody, withRateLimit } from './_shared';

interface Context {
  request: Request;
  env: Record<string, string | undefined>;
}

export async function onRequestPost(context: Context): Promise<Response> {
  applyEnv(context.env);

  const rateLimited = await withRateLimit(context.request);
  if (rateLimited) return rateLimited;

  const body = (await readJsonBody(context.request)) as CreateCheckoutSessionApiRequest;
  const result = await handleCreateCheckoutSessionRoute(body, authHeader(context.request));
  return jsonResponse(result, result.success ? 200 : 400);
}
