import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl        = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey    = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided in .env');
}

const fetchWithTimeout: typeof fetch = (input, init) => {
  const ctrl = new AbortController();
  const id   = setTimeout(() => ctrl.abort(), 10_000);
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(id));
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout },
});

// Admin client — uses service role key to bypass RLS and email confirmation.
// Only used for admin-only operations (create/delete users).
export const supabaseAdmin = supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: fetchWithTimeout },
    })
  : null;
