import { supabase } from './supabase';

// The current access token must be captured before deletion runs, since the
// server invalidates the session as a side effect of removing the user.
export async function deleteMyAccount(): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase n\'est pas configuré.' };

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: 'not_authenticated' };

  try {
    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    let result: { success?: boolean; error?: string };
    try {
      result = await res.json();
    } catch {
      return { error: `Réponse invalide du serveur (${res.status}).` };
    }

    if (!res.ok || !result.success) {
      return { error: result.error || 'La suppression du compte a échoué.' };
    }

    return { error: null };
  } catch (err) {
    // A rejected fetch() (network drop) must not throw past this point —
    // the caller only resets its "deleting..." state after seeing this
    // return value, same class of stuck-spinner bug found in stripeApi.ts.
    console.error('[accountApi] Account deletion request failed:', err);
    return { error: 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.' };
  }
}

// RGPD Art. 20 (portabilité) — aggregates every Supabase table holding this
// user's personal data server-side; see exportAccountApi.ts.
export async function exportMyAccountData(): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  if (!supabase) return { data: null, error: 'Supabase n\'est pas configuré.' };

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { data: null, error: 'not_authenticated' };

  try {
    const res = await fetch('/api/account/export', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    let result: { success?: boolean; data?: Record<string, unknown>; error?: string };
    try {
      result = await res.json();
    } catch {
      return { data: null, error: `Réponse invalide du serveur (${res.status}).` };
    }

    if (!res.ok || !result.success) {
      return { data: null, error: result.error || "L'export des données a échoué." };
    }

    return { data: result.data || null, error: null };
  } catch (err) {
    console.error('[accountApi] Account export request failed:', err);
    return { data: null, error: 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.' };
  }
}
