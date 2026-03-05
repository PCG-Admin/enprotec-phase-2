import { supabase, supabaseAdmin } from '../client';
import type { ProfileRow } from '../database.types';
import { User, UserRole, UserStatus } from '../../types';

/** Normalize role strings that may have been inserted with wrong casing */
const normalizeRole = (r: string): UserRole => {
  const s = r.toLowerCase().trim();
  if (s === 'admin')                                      return UserRole.Admin;
  if (s === 'fleet coordinator' || s === 'fleetcoordinator') return UserRole.FleetCoordinator;
  return UserRole.Driver;
};

/** Map a DB profile row to the app's User type */
const toUser = (p: ProfileRow): User => ({
  id:     p.id,
  name:   p.name,
  email:  p.email,
  role:   normalizeRole(p.role),
  status: p.status as UserStatus,
});

/** Build a basic User from Supabase auth metadata (fallback when DB is unavailable) */
const userFromMeta = (authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): User | null => {
  const meta = authUser.user_metadata ?? {};
  if (!meta.name && !authUser.email) return null;
  return {
    id:     authUser.id,
    name:   (meta.name as string) ?? authUser.email ?? 'User',
    email:  authUser.email ?? '',
    role:   (meta.role as UserRole) ?? UserRole.Admin,
    status: UserStatus.Active,
  };
};

/** Fetch the profile for a given auth user ID with a 5-second timeout */
export async function fetchProfile(userId: string): Promise<User | null> {
  const dbFetch = supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
    .then(({ data, error }) => (error || !data ? null : toUser(data)));

  // Race the DB fetch against a 5-second timeout
  const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 5000));
  return Promise.race([dbFetch, timeout]);
}

/** Sign in with email + password; returns the User profile on success */
export async function signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: 'Login failed. Please try again.' };

  // Try DB profile first; fall back to auth metadata if DB is slow/unavailable
  const profile = await fetchProfile(data.user.id);
  if (profile) return { user: profile, error: null };

  const fallback = userFromMeta(data.user as Parameters<typeof userFromMeta>[0]);
  if (fallback) return { user: fallback, error: null };

  return { user: null, error: 'Profile not found. Contact your administrator.' };
}

/** Sign out the current user */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Subscribe to auth state changes and resolve to User profile */
export function onAuthStateChange(callback: (user: User | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
    // Only update the user when a valid session exists.
    // Never call callback(null) here — App.tsx handleLogout calls setUser(null) directly,
    // so we don't need to react to SIGNED_OUT (which also fires on failed token refresh).
    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
      callback(profile ?? userFromMeta(session.user as Parameters<typeof userFromMeta>[0]));
    }
  });
  return () => subscription.unsubscribe();
}

/** Get the current session's user profile (for initial load) */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const profile = await fetchProfile(session.user.id);
  return profile ?? userFromMeta(session.user as Parameters<typeof userFromMeta>[0]);
}

/**
 * Admin: create a new fleet user using the service role key.
 * Bypasses email confirmation entirely — user can log in immediately.
 */
export async function createFleetUser(
  email: string,
  password: string,
  name: string,
  role: UserRole,
): Promise<{ error: string | null }> {
  if (!supabaseAdmin) {
    return { error: 'Service role key not configured. Add VITE_SUPABASE_SERVICE_ROLE_KEY to .env' };
  }

  // admin.createUser bypasses email confirmation
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { name, role },
    email_confirm: true,   // mark as confirmed immediately
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: 'User creation failed.' };

  // Give the handle_new_user trigger a moment, then update the profile
  await new Promise(r => setTimeout(r, 500));
  await supabaseAdmin.from('profiles')
    .update({ name, email, role, status: 'Active' })
    .eq('id', data.user.id);

  return { error: null };
}

/**
 * Admin: permanently delete a user from auth + profiles (cascade).
 */
export async function deleteFleetUser(userId: string): Promise<{ error: string | null }> {
  if (!supabaseAdmin) {
    return { error: 'Service role key not configured.' };
  }
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  return { error: error?.message ?? null };
}
