import { supabase } from '../client';
import type { ComplianceRow, CompStatus } from '../database.types';

export type ComplianceInsert = Omit<ComplianceRow, 'id' | 'created_at' | 'updated_at'>;
export type ComplianceUpdate = Partial<ComplianceInsert>;

export async function getComplianceSchedule(): Promise<ComplianceRow[]> {
  const { data, error } = await supabase
    .from('compliance_schedule')
    .select('*')
    .order('due_date');
  if (error) throw error;
  return data ?? [];
}

export async function getComplianceByStatus(status: CompStatus): Promise<ComplianceRow[]> {
  const { data, error } = await supabase
    .from('compliance_schedule')
    .select('*')
    .eq('status', status)
    .order('due_date');
  if (error) throw error;
  return data ?? [];
}

export async function getComplianceByVehicle(vehicleId: string): Promise<ComplianceRow[]> {
  const { data, error } = await supabase
    .from('compliance_schedule')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('due_date');
  if (error) throw error;
  return data ?? [];
}

export async function createComplianceEntry(entry: ComplianceInsert): Promise<ComplianceRow> {
  const { data, error } = await supabase
    .from('compliance_schedule')
    .insert(entry)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateComplianceEntry(id: string, updates: ComplianceUpdate): Promise<ComplianceRow> {
  const { data, error } = await supabase
    .from('compliance_schedule')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markCompleted(id: string): Promise<ComplianceRow> {
  return updateComplianceEntry(id, {
    status:         'Completed',
    completed_date: new Date().toISOString().slice(0, 10),
  });
}

export async function deleteComplianceEntry(id: string): Promise<void> {
  const { error } = await supabase.from('compliance_schedule').delete().eq('id', id);
  if (error) throw error;
}

/** Recalculate and sync status field based on due_date */
export async function syncComplianceStatuses(): Promise<void> {
  const today     = new Date().toISOString().slice(0, 10);
  const soonCutoff = new Date();
  soonCutoff.setDate(soonCutoff.getDate() + 14);
  const soonStr   = soonCutoff.toISOString().slice(0, 10);

  // Mark overdue
  await supabase
    .from('compliance_schedule')
    .update({ status: 'Overdue' })
    .lt('due_date', today)
    .neq('status', 'Completed');

  // Mark due soon
  await supabase
    .from('compliance_schedule')
    .update({ status: 'Due Soon' })
    .gte('due_date', today)
    .lte('due_date', soonStr)
    .neq('status', 'Completed');
}
