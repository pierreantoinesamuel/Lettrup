import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

// Strips a single layer of matching wrapping quotes — hosting dashboards
// (e.g. Cloudflare Pages) store variable values verbatim, so a value
// copy-pasted from .env.local's `KEY="value"` syntax keeps the quote
// characters instead of having them stripped like dotenv would.
function unquote(value: string): string {
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // NOTE: import.meta.env must be accessed directly (no optional chaining,
  // no `as any` cast) — Vite's static replacement for import.meta.env only
  // matches the literal member-expression pattern. Wrapping it in `?.` or a
  // cast produces a different AST shape that Vite doesn't substitute, so the
  // values silently come back undefined in the browser at runtime.
  const supabaseUrl: string = unquote(
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.SUPABASE_URL ||
    (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL : '') ||
    ''
  );

  const supabaseAnonKey: string = unquote(
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.SUPABASE_ANON_KEY ||
    (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY : '') ||
    ''
  );

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseInstance;
  } catch (err) {
    console.warn('[Supabase] Failed to initialize Supabase client:', err);
    return null;
  }
}

export const supabase = getSupabaseClient();
