export interface SendContactMessageInput {
  name: string;
  email: string;
  topic: string;
  message: string;
}

export async function sendContactMessage(input: SendContactMessageInput): Promise<{ error: string | null }> {
  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const result = await res.json();

  if (!res.ok || !result.success) {
    return { error: result.error || "L'envoi du message a échoué." };
  }

  return { error: null };
}
