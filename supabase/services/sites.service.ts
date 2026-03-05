import { supabase } from '../client';
import type { SiteRow } from '../database.types';

export type SiteInsert = Omit<SiteRow, 'id' | 'created_at' | 'updated_at'>;
export type SiteUpdate = Partial<SiteInsert>;

export async function getSites(): Promise<SiteRow[]> {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getSite(id: string): Promise<SiteRow | null> {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createSite(site: SiteInsert): Promise<SiteRow> {
  const { data, error } = await supabase
    .from('sites')
    .insert(site)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSite(id: string, updates: SiteUpdate): Promise<SiteRow> {
  const { data, error } = await supabase
    .from('sites')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSite(id: string): Promise<void> {
  const { error } = await supabase.from('sites').delete().eq('id', id);
  if (error) throw error;
}
