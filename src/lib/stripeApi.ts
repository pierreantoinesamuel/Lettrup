import { supabase } from './supabase';

export interface CheckoutRedirectOptions {
  successPath?: string;
  cancelPath?: string;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// A rejected fetch() (network drop, CORS block) or a non-JSON response body
// (a proxy's HTML error page, a hung request eventually cut by a gateway
// timeout) throws instead of resolving — every caller of these three
// functions only clears its loading spinner in the `{ error }` branch, so an
// uncaught throw here left the UI stuck on "Redirection..." forever with no
// console output. Centralizing the try/catch here means every call site's
// `if (error)` check is guaranteed to eventually run.
async function postForCheckoutUrl(path: string, body?: unknown): Promise<{ error: string | null }> {
  const headers = await getAuthHeader();
  if (!headers.Authorization) {
    return { error: 'not_authenticated' };
  }

  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data: { url?: string; error?: string };
    try {
      data = await res.json();
    } catch {
      return { error: `Réponse invalide du serveur (${res.status}).` };
    }

    if (!res.ok || !data.url) {
      return { error: data.error || 'Une erreur est survenue.' };
    }

    window.location.href = data.url;
    return { error: null };
  } catch (err) {
    console.error(`[stripeApi] Request to ${path} failed:`, err);
    return { error: 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.' };
  }
}

export async function startCheckout(
  planId: string,
  interval: 'month' | 'year',
  redirectOptions: CheckoutRedirectOptions = {}
): Promise<{ error: string | null }> {
  return postForCheckoutUrl('/api/stripe/create-checkout-session', { planId, interval, ...redirectOptions });
}

export async function startSetupSession(): Promise<{ error: string | null }> {
  return postForCheckoutUrl('/api/stripe/create-setup-session');
}

export async function openBillingPortal(): Promise<{ error: string | null }> {
  return postForCheckoutUrl('/api/stripe/create-portal-session');
}
