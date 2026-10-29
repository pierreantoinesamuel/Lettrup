/**
 * Infrastructure Layer: API Route Handler for the Contact & Support form
 * Route: POST /api/contact
 *
 * Sends a real email to Lettrup's support inbox when a visitor or user
 * submits the /contact page form. Mirrors portfolioContactApi.ts: a fixed,
 * server-side recipient (never taken from the request body) plus its own
 * per-IP send cap, so this can't be scripted into an open email relay.
 */

import { ResendEmailAdapter } from '../email/ResendEmailAdapter';

import { EMAILS } from '../../config/brand';
export interface ContactSupportApiRequest {
  name: string;
  email: string;
  topic: string;
  message: string;
}

export interface ContactSupportApiResponse {
  success: boolean;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SUPPORT_INBOX = process.env.SUPPORT_INBOX_EMAIL || EMAILS.support;

const TOPIC_LABELS: Record<string, string> = {
  technical: 'Support technique',
  billing: 'Facturation & Abonnements',
  privacy: 'RGPD & Confidentialité',
  partnership: 'Partenariats',
  other: 'Autre',
};

const MAX_PER_IP_PER_HOUR = 5;
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

export async function handleContactSupportRoute(
  reqBody: ContactSupportApiRequest,
  clientIp: string = 'unknown',
  emailAdapter: ResendEmailAdapter = new ResendEmailAdapter()
): Promise<ContactSupportApiResponse> {
  const { name, email, topic, message } = reqBody || ({} as ContactSupportApiRequest);

  if (!name?.trim() || !email || !EMAIL_RE.test(email) || !message?.trim()) {
    return { success: false, error: 'Nom, email et message sont requis.' };
  }
  if (message.trim().length > 5000) {
    return { success: false, error: 'Le message est trop long (5000 caractères maximum).' };
  }

  if (isRateLimited(clientIp)) {
    return { success: false, error: `Vous avez atteint la limite de ${MAX_PER_IP_PER_HOUR} messages par heure. Veuillez réessayer plus tard.` };
  }

  const topicLabel = TOPIC_LABELS[topic] || TOPIC_LABELS.other;

  const result = await emailAdapter.sendRawEmail({
    to: SUPPORT_INBOX,
    replyTo: email,
    subject: `[${topicLabel}] Nouveau message de ${name.trim()} — Contact Lettrup`,
    text: [
      `${name.trim()} <${email}> a envoyé un message via le formulaire de contact Lettrup.`,
      `Sujet : ${topicLabel}`,
      '',
      message.trim(),
      '',
      '---',
      `Répondez directement à cet email pour contacter ${name.trim()}.`,
    ].join('\n'),
  });

  if (!result.success) {
    return { success: false, error: result.error || "Échec de l'envoi du message." };
  }
  return { success: true };
}
