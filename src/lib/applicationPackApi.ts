import { supabase } from './supabase';
import type { ApplicationPack } from '../application/application-pack/GenerateApplicationPack';
import type { ApplicationPackErrorCode } from '../infrastructure/routes/applicationPackApi';

export type { ApplicationPack, StarSheet } from '../application/application-pack/GenerateApplicationPack';

export interface GenerateApplicationPackInput {
  cvId: string;
  jobPostingUrl?: string;
  jobOfferText?: string;
}

export type GenerateApplicationPackResult =
  | { ok: true; pack: ApplicationPack; token: string; offerSource?: string }
  | { ok: false; code: ApplicationPackErrorCode | 'network' | 'not_authenticated'; error: string };

// A non-JSON answer (HTML 404/502 page) means the API itself is unreachable or
// outdated, which is not a network failure on the user's side.
async function readJson(res: Response): Promise<any | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

const SERVICE_UNAVAILABLE = 'Le service est momentanément indisponible. Réessayez dans quelques instants.';

export async function generateApplicationPack(input: GenerateApplicationPackInput): Promise<GenerateApplicationPackResult> {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (!session?.access_token) {
    return { ok: false, code: 'not_authenticated', error: 'Connectez-vous pour générer votre pack.' };
  }

  try {
    const res = await fetch('/api/application-pack/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(input),
      // Two chained AI calls: long, but never open-ended.
      signal: AbortSignal.timeout(240_000),
    });
    const data = await readJson(res);
    if (!data) return { ok: false, code: 'generation_failed', error: SERVICE_UNAVAILABLE };
    if (data?.success && data.pack && data.token) {
      return { ok: true, pack: data.pack as ApplicationPack, token: data.token as string, offerSource: data.offerSource };
    }
    return {
      ok: false,
      code: (data?.code as ApplicationPackErrorCode) || 'generation_failed',
      error: data?.error || 'Une erreur est survenue.',
    };
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      return { ok: false, code: 'generation_failed', error: 'La génération prend trop de temps. Réessayez dans quelques instants.' };
    }
    return { ok: false, code: 'network', error: 'Connexion impossible. Vérifiez votre réseau et réessayez.' };
  }
}

// The pack lives in memory only; it is parked in sessionStorage across the
// Stripe redirect so the buyer finds it again on return. Nothing is persisted
// beyond the browser tab.
const PENDING_KEY = 'cvpilot_pending_application_pack';

export interface PendingPack {
  /** Redacted preview + the sealed token; the full pack never sits in the browser before payment. */
  pack: ApplicationPack;
  token: string;
  header: { name: string; contact: string[] };
}

export function savePendingPack(value: PendingPack): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(value));
  } catch {
    // Storage unavailable: the user can simply regenerate the pack.
  }
}

export function loadPendingPack(): PendingPack | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingPack) : null;
  } catch {
    return null;
  }
}

export function clearPendingPack(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}

export function hasPendingPack(): boolean {
  return loadPendingPack() !== null;
}

export type DownloadApplicationPackResult =
  | { ok: true; pack: ApplicationPack }
  | { ok: false; code: 'payment_required' | 'invalid_token' | 'credit_failed' | 'network' | 'not_authenticated'; reason?: 'quota_exceeded' | 'no_subscription'; error: string };

/** Asks the server for the full pack: it checks and consumes the CV + cover-letter credits first. */
export async function downloadApplicationPack(token: string): Promise<DownloadApplicationPackResult> {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (!session?.access_token) {
    return { ok: false, code: 'not_authenticated', error: 'Connectez-vous pour télécharger votre pack.' };
  }
  try {
    const res = await fetch('/api/application-pack/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ token }),
    });
    const data = await readJson(res);
    if (!data) return { ok: false, code: 'invalid_token', error: SERVICE_UNAVAILABLE };
    if (data?.success && data.pack) return { ok: true, pack: data.pack as ApplicationPack };
    return { ok: false, code: data?.code || 'invalid_token', reason: data?.reason, error: data?.error || 'Une erreur est survenue.' };
  } catch {
    return { ok: false, code: 'network', error: 'Connexion impossible. Vérifiez votre réseau et réessayez.' };
  }
}
