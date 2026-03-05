import { supabase } from '../client';
import type { InspectionRow } from '../database.types';

export type InspectionInsert = Omit<InspectionRow, 'id' | 'created_at' | 'updated_at'>;
export type InspectionUpdate = Partial<InspectionInsert>;

export async function getInspections(limit = 100): Promise<InspectionRow[]> {
  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getInspectionsByVehicle(vehicleId: string): Promise<InspectionRow[]> {
  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getInspection(id: string): Promise<InspectionRow | null> {
  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createInspection(inspection: InspectionInsert): Promise<InspectionRow> {
  const { data, error } = await supabase
    .from('inspections')
    .insert(inspection)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInspection(id: string, updates: InspectionUpdate): Promise<InspectionRow> {
  const { data, error } = await supabase
    .from('inspections')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteInspection(id: string): Promise<void> {
  const { error } = await supabase.from('inspections').delete().eq('id', id);
  if (error) throw error;
}

/** Dashboard helper: inspections in the last N days */
export async function getRecentInspections(days = 7): Promise<InspectionRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .gte('started_at', since.toISOString())
    .order('started_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Dashboard helper: inspections by a specific inspector in the last N days */
export async function getRecentInspectionsByInspector(inspectorId: string, days = 7): Promise<InspectionRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .eq('inspector_id', inspectorId)
    .gte('started_at', since.toISOString())
    .order('started_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** All inspections by a specific inspector (for vehicle list) */
export async function getInspectionsByInspector(inspectorId: string): Promise<InspectionRow[]> {
  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .eq('inspector_id', inspectorId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Count overdue (in_progress past 24h) inspections */
export async function getOverdueCount(): Promise<number> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const { count, error } = await supabase
    .from('inspections')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'in_progress')
    .lt('started_at', yesterday.toISOString());
  if (error) throw error;
  return count ?? 0;
}
