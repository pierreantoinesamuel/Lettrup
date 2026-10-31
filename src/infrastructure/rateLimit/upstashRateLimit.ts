import type { NextFunction, Request, Response } from 'express';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const MAX_REQUESTS_PER_IP = 20;
const IP_WINDOW = '60 s';
const IP_WINDOW_MS = 60 * 1000;

const MAX_AI_PER_USER = 8;
const USER_AI_WINDOW = '3600 s';
const USER_AI_WINDOW_MS = 3600 * 1000;

let ipLimiter: Ratelimit | null = null;
let userAiLimiter: Ratelimit | null = null;
let configChecked = false;

const inMemorySlidingWindow = new Map<string, number[]>();

function checkInMemoryRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (inMemorySlidingWindow.get(key) || []).filter((t) => t > windowStart);

  if (timestamps.length >= max) {
    const oldest = timestamps[0] || windowStart;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { allowed: false, limit: max, remaining: 0, retryAfterSeconds };
  }

  timestamps.push(now);
  inMemorySlidingWindow.set(key, timestamps);
  return { allowed: true, limit: max, remaining: max - timestamps.length };
}

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[rateLimitMiddleware] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not configured. ' +
        'Refusing to start in production without a rate limiter.'
      );
    }
    if (!configChecked) {
      console.warn('[rateLimitMiddleware] Upstash not configured — rate limiting is DISABLED (dev only).');
      configChecked = true;
    }
    return null;
  }
  return new Redis({ url, token });
}

function getIpLimiter(): Ratelimit | null {
  if (ipLimiter) return ipLimiter;
  const redis = getRedisClient();
  if (!redis) return null;
  ipLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(MAX_REQUESTS_PER_IP, IP_WINDOW), prefix: 'cvpilot:ratelimit:ai' });
  return ipLimiter;
}

function getUserAiLimiter(): Ratelimit | null {
  if (userAiLimiter) return userAiLimiter;
  const redis = getRedisClient();
  if (!redis) return null;
  userAiLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(MAX_AI_PER_USER, USER_AI_WINDOW), prefix: 'cvpilot:ratelimit:ai-user' });
  return userAiLimiter;
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
  const limiter = getIpLimiter();
  if (!limiter) {
    return checkInMemoryRateLimit(`ip:${ip}`, MAX_REQUESTS_PER_IP, IP_WINDOW_MS);
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(ip);
    if (!success) {
      const retryAfterSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
      return { allowed: false, limit, remaining, retryAfterSeconds };
    }
    return { allowed: true, limit, remaining };
  } catch (err) {
    console.error('[checkRateLimit] Upstash error, falling back to in-memory limiter:', err);
    return checkInMemoryRateLimit(`ip:${ip}`, MAX_REQUESTS_PER_IP, IP_WINDOW_MS);
  }
}

export async function checkUserAiRateLimit(userId: string): Promise<RateLimitResult> {
  const limiter = getUserAiLimiter();
  if (!limiter) {
    return checkInMemoryRateLimit(`user-ai:${userId}`, MAX_AI_PER_USER, USER_AI_WINDOW_MS);
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(userId);
    if (!success) {
      const retryAfterSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
      return { allowed: false, limit, remaining, retryAfterSeconds };
    }
    return { allowed: true, limit, remaining };
  } catch (err) {
    console.error('[checkUserAiRateLimit] Upstash error, falling back to in-memory limiter:', err);
    return checkInMemoryRateLimit(`user-ai:${userId}`, MAX_AI_PER_USER, USER_AI_WINDOW_MS);
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
