/**
 * Shared helpers for the Cloudflare Pages Functions in this folder.
 *
 * Filenames starting with `_` are not routed by Cloudflare Pages Functions
 * (same convention as `_middleware.ts`), so this file is safe to keep here.
 */

import { checkRateLimit } from '../../../src/infrastructure/rateLimit/upstashRateLimit';

// Every route handler under src/infrastructure/routes reads its config via
// bare `process.env.X` (shared with server.ts's Node/Express runtime). The
// Workers runtime has no reliable Node `process` global, so each Pages
// Function must expose Cloudflare's `context.env` before calling into a
// handler. Preserve any existing process-like object because SDKs may read
// fields other than env.
export function applyEnv(env: Record<string, string | undefined>): void {
  const globalWithProcess = globalThis as unknown as {
    process?: { env?: Record<string, string | undefined>; [key: string]: unknown };
  };
  globalWithProcess.process = {
    ...(globalWithProcess.process || {}),
    env: {
      ...(globalWithProcess.process?.env || {}),
      ...env,
    },
  };
}

export function clientIp(request: Request): string {
  // Cloudflare always sets this on requests reaching a Pages Function.
  return request.headers.get('cf-connecting-ip') || 'unknown';
}

export function jsonResponse(body: unknown, status: number, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

// Mirrors rateLimitMiddleware (upstashRateLimit.ts) for the Express routes —
// returns a 429 Response to short-circuit on, or null to continue.
export async function withRateLimit(request: Request): Promise<Response | null> {
  const result = await checkRateLimit(clientIp(request));
  if (result.allowed) return null;

  return jsonResponse(
    { error: 'Trop de requêtes. Veuillez réessayer dans quelques instants.' },
    429,
    {
      'Retry-After': String(result.retryAfterSeconds ?? 0),
      ...(result.limit !== undefined ? { 'X-RateLimit-Limit': String(result.limit) } : {}),
      ...(result.remaining !== undefined ? { 'X-RateLimit-Remaining': String(result.remaining) } : {}),
    }
  );
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function authHeader(request: Request): string | undefined {
  return request.headers.get('authorization') || undefined;
}
