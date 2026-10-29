/**
 * Auth Rate Limiter
 * Protects Supabase and Backend authentication endpoints against brute-force and DDoS attacks
 * Enforces strict per-minute request limits.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitMap: Map<string, RateLimitRecord> = new Map();
const STORAGE_KEY = 'cvpilot_rate_limit_records';

function getStoredRecords(): Record<string, number[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredRecords(records: Record<string, number[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage quota errors
  }
}

export function checkRateLimit(
  key: string = 'global_auth',
  maxRequestsPerMinute: number = 5,
  windowMs: number = 60000
): { allowed: boolean; remainingMs: number; attemptsCount: number } {
  const now = Date.now();
  const stored = getStoredRecords();
  let timestamps = stored[key] || rateLimitMap.get(key)?.timestamps || [];

  // Filter timestamps within sliding window
  timestamps = timestamps.filter((t) => now - t < windowMs);

  if (timestamps.length >= maxRequestsPerMinute) {
    const oldest = timestamps[0];
    const remainingMs = Math.max(0, windowMs - (now - oldest));
    return {
      allowed: false,
      remainingMs,
      attemptsCount: timestamps.length,
    };
  }

  return {
    allowed: true,
    remainingMs: 0,
    attemptsCount: timestamps.length,
  };
}

export function recordAuthAttempt(
  key: string = 'global_auth',
  windowMs: number = 60000
): { allowed: boolean; remainingMs: number; attemptsCount: number } {
  const now = Date.now();
  const stored = getStoredRecords();
  let timestamps = stored[key] || rateLimitMap.get(key)?.timestamps || [];

  // Filter timestamps within sliding window
  timestamps = timestamps.filter((t) => now - t < windowMs);

  timestamps.push(now);
  stored[key] = timestamps;
  saveStoredRecords(stored);
  rateLimitMap.set(key, { timestamps });

  const maxRequestsPerMinute = 5;
  if (timestamps.length > maxRequestsPerMinute) {
    const oldest = timestamps[0];
    const remainingMs = Math.max(0, windowMs - (now - oldest));
    return {
      allowed: false,
      remainingMs,
      attemptsCount: timestamps.length,
    };
  }

  return {
    allowed: true,
    remainingMs: 0,
    attemptsCount: timestamps.length,
  };
}
