/**
 * Infrastructure Layer: API Route Handler for Portfolio Contact Form
 * Route: POST /api/portfolio/contact
 *
 * Sends a real email to a published portfolio's owner when a visitor
 * submits the "Me Contacter" form (see PortfolioBuilder.tsx).
 *
 * The recipient is resolved server-side from `websiteId` (a published
 * website_configs row) rather than trusted from the request body — an
 * attacker-controlled `toEmail` would otherwise turn this endpoint into
 * an open relay that sends arbitrary mail to arbitrary addresses through
 * Lettrup's Resend account (security audit 1.4).
 */

import { ResendEmailAdapter } from '../email/ResendEmailAdapter';
import { getSupabaseAdminClient } from '../supabase/supabaseAdminClient';

export interface PortfolioContactApiRequest {
  websiteId: string;
  fromName: string;
  fromEmail: string;
  message: string;
}

export interface PortfolioContactApiResponse {
  success: boolean;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Independent of the shared Upstash per-IP limiter (which may be disabled
// in dev, see upstashRateLimit.ts): this endpoint sends real email through
// a paid provider on behalf of an unauthenticated visitor, so it always
// gets its own hard cap regardless of Upstash configuration.
const MAX_PER_IP_PER_HOUR = 3;
const HOUR_MS = 60 * 60 * 1000;
const sendLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (sendLog.get(ip) || []).filter((t) => now - t < HOUR_MS);
  if (timestamps.length >= MAX_PER_IP_PER_HOUR) {
    sendLog.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  sendLog.set(ip, timestamps);
  return false;
}

export async function handlePortfolioContactRoute(
  reqBody: PortfolioContactApiRequest,
  clientIp: string = 'unknown',
  emailAdapter: ResendEmailAdapter = new ResendEmailAdapter()
): Promise<PortfolioContactApiResponse> {
  const { websiteId, fromName, fromEmail, message } = reqBody || ({} as PortfolioContactApiRequest);

  if (!websiteId || !UUID_RE.test(websiteId)) {
    return { success: false, error: 'Portfolio invalide.' };
  }
  if (!fromName?.trim() || !fromEmail || !EMAIL_RE.test(fromEmail) || !message?.trim()) {
    return { success: false, error: 'Nom, email et message sont requis.' };
  }

  if (isRateLimited(clientIp)) {
    return { success: false, error: `Vous avez atteint la limite de ${MAX_PER_IP_PER_HOUR} messages par heure. Veuillez réessayer plus tard.` };
  }

  const admin = getSupabaseAdminClient();
  const { data: website, error: websiteError } = await admin
    .from('website_configs')
    .select('user_id, config_name, is_published')
    .eq('id', websiteId)
    .eq('is_published', true)
    .maybeSingle();

  if (websiteError || !website) {
    return { success: false, error: 'Portfolio introuvable ou non publié.' };
  }

  const { data: owner, error: ownerError } = await admin
    .from('profiles')
    .select('email, name')
    .eq('id', website.user_id)
    .maybeSingle();

  if (ownerError || !owner?.email) {
    return { success: false, error: "Le propriétaire de ce portfolio n'a pas d'adresse email configurée." };
  }

  const result = await emailAdapter.sendRawEmail({
    to: owner.email,
    replyTo: fromEmail,
    subject: `Nouveau message via votre portfolio Lettrup — ${fromName}`,
    text: [
      `${fromName} <${fromEmail}> vous a contacté via votre portfolio Lettrup (${website.config_name}) :`,
      '',
      message.trim(),
      '',
      '---',
      `Répondez directement à cet email pour contacter ${fromName}.`,
    ].join('\n'),
  });

  if (!result.success) {
    return { success: false, error: result.error || "Échec de l'envoi du message." };
  }
  return { success: true };
}
