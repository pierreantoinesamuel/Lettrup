import { getTrialLifecycleEmailTemplate } from './emailTemplates';

// Never log a full email address or message body — even in the mock-send
// path, this can end up in log aggregators (security audit 2.3). Only a
// truncated, non-identifying form is safe to print.
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
}

export interface SendEmailOptions {
  to: string;
  templateType: 'day2' | 'reminder1' | 'reminder2' | 'reminder3';
  context?: { cancellationDate?: string; activeFeaturesUsed?: number };
}

export interface SendRawEmailOptions {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
}

export class ResendEmailAdapter {
  private getApiKey(): string | undefined {
    if (typeof process !== 'undefined' && process.env?.RESEND_API_KEY) {
      return process.env.RESEND_API_KEY;
    }
    return undefined;
  }

  // Generic send, used by flows that aren't one of the trial-lifecycle templates
  // (e.g. the public portfolio "Contact Me" form).
  async sendRawEmail(options: SendRawEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      // Masked recipient, body length only — never the full address or
      // message content, even in this dev-only mock path (audit 2.3).
      console.log(`[ResendEmailAdapter Mock Send] To: ${maskEmail(options.to)} | Subject: ${options.subject} | Body length: ${options.text.length}`);
      return { success: true, id: `mock-email-${Date.now()}` };
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'Lettrup <onboarding@resend.dev>',
          to: [options.to],
          ...(options.replyTo ? { reply_to: options.replyTo } : {}),
          subject: options.subject,
          text: options.text,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(`Resend API error (${res.status}): ${errJson.message || res.statusText}`);
      }

      const data = await res.json();
      return { success: true, id: data.id };
    } catch (err: any) {
      console.error(`[ResendEmailAdapter] Failed to send email: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async sendTrialLifecycleEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
    const template = getTrialLifecycleEmailTemplate(options.templateType, options.context);
    const apiKey = this.getApiKey();

    if (!apiKey) {
      console.log(`[ResendEmailAdapter Mock Send] To: ${maskEmail(options.to)} | Subject: ${template.subject} | Body length: ${template.body.length}`);
      return { success: true, id: `mock-email-${Date.now()}` };
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'Lettrup <onboarding@resend.dev>',
          to: [options.to],
          subject: template.subject,
          text: template.body,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(`Resend API error (${res.status}): ${errJson.message || res.statusText}`);
      }

      const data = await res.json();
      return { success: true, id: data.id };
    } catch (err: any) {
      console.error(`[ResendEmailAdapter] Failed to send email: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}
