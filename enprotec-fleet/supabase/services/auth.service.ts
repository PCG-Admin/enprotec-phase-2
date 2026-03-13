import { supabase, supabaseAdmin } from '../client';
import { User, UserRole, UserStatus } from '../../types';

// ─── Row shape returned by en_users ──────────────────────────────────────────
interface EnUserRow {
  id:           string;
  name:         string;
  email:        string;
  role:         string;
  status:       string;
  fleet_access: boolean;
  sites?:       string[] | null;
  departments?: string[] | null;
}

const toUser = (row: EnUserRow): User => ({
  id:           row.id,
  name:         row.name,
  email:        row.email,
  role:         row.role,
  status:       (row.status as UserStatus) ?? UserStatus.Active,
  fleet_access: row.fleet_access ?? false,
  sites:        row.sites ?? null,
  departments:  row.departments ?? null,
});

/** Build a minimal User from Supabase auth metadata (fallback when DB is unavailable) */
const userFromMeta = (
  authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> },
): User | null => {
  const meta = authUser.user_metadata ?? {};
  if (!meta.name && !authUser.email) return null;
  return {
    id:           authUser.id,
    name:         (meta.name as string) ?? authUser.email ?? 'User',
    email:        authUser.email ?? '',
    role:         (meta.role as string) ?? UserRole.Admin,
    status:       UserStatus.Active,
    fleet_access: false,
  };
};

// ─── Core fetch (queries en_users by Supabase auth user ID) ──────────────────
export async function fetchProfile(userId: string): Promise<User | null> {
  const dbFetch = supabase
    .from('en_users')
    .select('id, name, email, role, status, fleet_access, sites, departments')
    .eq('id', userId)
    .maybeSingle()
    .then(({ data, error }) => (error || !data ? null : toUser(data as EnUserRow)));

  const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 5000));
  return Promise.race([dbFetch, timeout]);
}

// ─── Sign in ──────────────────────────────────────────────────────────────────
export async function signIn(
  email: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: 'Login failed. Please try again.' };

  const profile = await fetchProfile(data.user.id);
  if (profile) return { user: profile, error: null };

  const fallback = userFromMeta(data.user as Parameters<typeof userFromMeta>[0]);
  if (fallback) return { user: fallback, error: null };

  return { user: null, error: 'Profile not found. Contact your administrator.' };
}

// ─── Sign out ─────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// ─── Auth state changes ───────────────────────────────────────────────────────
export function onAuthStateChange(callback: (user: User | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
      callback(profile ?? userFromMeta(session.user as Parameters<typeof userFromMeta>[0]));
    }
  });
  return () => subscription.unsubscribe();
}

// ─── Get session (for cross-app token passing) ────────────────────────────────
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ─── Get current user (initial load) ─────────────────────────────────────────
export async function getCurrentUser(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const profile = await fetchProfile(session.user.id);
  return profile ?? userFromMeta(session.user as Parameters<typeof userFromMeta>[0]);
}

// ─── Admin: create a fleet/ops user in en_users ───────────────────────────────
export async function createFleetUser(
  email: string,
  password: string,
  name: string,
  role: string,
  fleet_access = false,
): Promise<{ error: string | null }> {
  if (!supabaseAdmin) {
    return { error: 'Service role key not configured. Add VITE_SUPABASE_SERVICE_ROLE_KEY to .env' };
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { name, role },
    email_confirm: true,
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: 'User creation failed.' };

  // Give the DB trigger a moment, then upsert the en_users record
  await new Promise(r => setTimeout(r, 500));
  await supabaseAdmin
    .from('en_users')
    .upsert({
      id:           data.user.id,
      name,
      email,
      role,
      status:       'Active',
      fleet_access,
    });

  return { error: null };
}

// ─── Admin: delete a user ─────────────────────────────────────────────────────
export async function deleteFleetUser(userId: string): Promise<{ error: string | null }> {
  if (!supabaseAdmin) return { error: 'Service role key not configured.' };
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  return { error: error?.message ?? null };
}
