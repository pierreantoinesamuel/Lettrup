import type { NextFunction, Request, Response } from 'express';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// AI-backed routes (CV tailoring, ATS scan/analyze, outreach generation,
// France Travail search) proxy paid AI providers — an unbounded client can
// run up real cost, so every one of those routes shares this per-IP limit.
const MAX_REQUESTS = 20;
const WINDOW = '60 s';
const WINDOW_MS = 60 * 1000;

let ratelimit: Ratelimit | null = null;
let configChecked = false;

// Fallback in-memory sliding window when Redis is offline or unconfigured
const inMemorySlidingWindow = new Map<string, number[]>();

function checkInMemoryRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const timestamps = (inMemorySlidingWindow.get(ip) || []).filter((t) => t > windowStart);

  if (timestamps.length >= MAX_REQUESTS) {
    const oldest = timestamps[0] || windowStart;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
    return {
      allowed: false,
      limit: MAX_REQUESTS,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  timestamps.push(now);
  inMemorySlidingWindow.set(ip, timestamps);
  return {
    allowed: true,
    limit: MAX_REQUESTS,
    remaining: MAX_REQUESTS - timestamps.length,
  };
}

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Fail-fast in production: a silently-unlimited AI/relay route in prod
    // is a real cost and abuse risk, so refuse to boot rather than run
    // open (audit 1.5). In dev, just warn and let requests through.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[rateLimitMiddleware] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not configured. ' +
        'Refusing to start in production without a rate limiter.'
      );
    }
    if (!configChecked) {
      console.warn(
        '[rateLimitMiddleware] Upstash not configured — rate limiting is DISABLED (dev only).'
      );
      configChecked = true;
    }
    return null;
  }

  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, WINDOW),
    prefix: 'cvpilot:ratelimit:ai',
  });
  return ratelimit;
}

function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export interface RateLimitResult {
  allowed: boolean;
  limit?: number;
  remaining?: number;
  // Only set when allowed is false.
  retryAfterSeconds?: number;
}

// Framework-agnostic core: shared by the Express middleware below and by
// Cloudflare Pages Functions (which have no req/res/next to work with).
// In dev without Upstash configured, this passes through (see getRatelimit
// above); in production, missing config throws at startup.
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const limiter = getRatelimit();
  if (!limiter) {
    return checkInMemoryRateLimit(ip);
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(ip);
    if (!success) {
      const retryAfterSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
      return { allowed: false, limit, remaining, retryAfterSeconds };
    }
    return { allowed: true, limit, remaining };
  } catch (err) {
    // If Redis encounters a network issue, fall back to in-memory sliding window
    console.error('[checkRateLimit] Upstash error, falling back to in-memory limiter:', err);
    return checkInMemoryRateLimit(ip);
  }
}

export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const result = await checkRateLimit(clientIp(req));

  if (result.limit !== undefined) res.setHeader('X-RateLimit-Limit', String(result.limit));
  if (result.remaining !== undefined) res.setHeader('X-RateLimit-Remaining', String(result.remaining));

  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfterSeconds ?? 0));
    res.status(429).json({
      error: 'Trop de requêtes. Veuillez réessayer dans quelques instants.',
    });
    return;
  }

  next();
}
