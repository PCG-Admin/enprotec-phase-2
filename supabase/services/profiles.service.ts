import { supabase } from '../client';
import type { ProfileRow, UserStatus } from '../database.types';

export type ProfileUpdate = Partial<Pick<ProfileRow, 'name' | 'role' | 'status' | 'fleet_access'>>;

const SELECT = 'id, name, email, role, status, fleet_access, sites, departments';

export async function getProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from('en_users')
    .select(SELECT)
    .order('name');
  if (error) throw error;
  return (data ?? []).map(r => ({ ...r, fleet_access: r.fleet_access ?? false }));
}

export async function getProfile(id: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('en_users')
    .select(SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data ? { ...data, fleet_access: data.fleet_access ?? false } : null;
}

export async function updateProfile(id: string, updates: ProfileUpdate): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('en_users')
    .update(updates)
    .eq('id', id)
    .select(SELECT)
    .single();
  if (error) throw error;
  return { ...data, fleet_access: data.fleet_access ?? false };
}

export async function setUserStatus(id: string, status: UserStatus): Promise<void> {
  const { error } = await supabase.from('en_users').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function setFleetAccess(id: string, fleet_access: boolean): Promise<void> {
  const { error } = await supabase.from('en_users').update({ fleet_access }).eq('id', id);
  if (error) throw error;
}
