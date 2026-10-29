/**
 * Infrastructure Layer: sealed application-pack tokens.
 *
 * The generated pack is encrypted (AES-256-GCM) and bound to the user who
 * generated it, then handed to the browser as an opaque token next to a
 * redacted preview. The full content can only be recovered server-side, by the
 * download route, after the CV and cover-letter credits have been checked and
 * consumed — so the paywall does not depend on anything the client controls.
 *
 * Stateless on purpose: no table, no migration. A token expires after a day.
 */

import crypto from 'crypto';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function getKey(): Buffer {
  const secret = process.env.APPLICATION_PACK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error('APPLICATION_PACK_SECRET (or SUPABASE_SERVICE_ROLE_KEY) is not configured.');
  }
  return crypto.createHash('sha256').update(`cvpilot-application-pack:${secret}`).digest();
}

export function sealPack(userId: string, payload: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const body = JSON.stringify({ uid: userId, exp: Date.now() + TOKEN_TTL_MS, data: payload });
  const encrypted = Buffer.concat([cipher.update(body, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

/** Returns the payload, or null when the token is forged, expired or belongs to someone else. */
export function openPack<T>(userId: string, token: string): T | null {
  try {
    const raw = Buffer.from(token, 'base64url');
    if (raw.length < 29) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(tag);
    const body = JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8'));
    if (body.uid !== userId || typeof body.exp !== 'number' || body.exp < Date.now()) return null;
    return body.data as T;
  } catch {
    return null;
  }
}
