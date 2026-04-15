import { supabase } from '../client';
import type { OpenActionRow } from '../database.types';

// Supabase v2 generic client doesn't resolve newly added tables at compile time.
// Use an untyped reference for open_actions (runtime behaviour is identical).
const openActions = () => (supabase as any).from('open_actions');

const OPEN_ACTION_SELECT = [
  '*',
  'vehicle:vehicles(id, registration, make, model)',
  'inspection:inspections(id, inspection_type, started_at, inspector_id)',
  'resolver:en_users!open_actions_resolved_by_fkey(id, name, email)',
].join(', ');

/* ─── Reads ─────────────────────────────────────────────────── */

export async function getOpenActions(limit = 200): Promise<OpenActionRow[]> {
  const { data, error } = await openActions()
    .select(OPEN_ACTION_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as OpenActionRow[];
}

export async function getOpenActionsByInspection(inspectionId: string): Promise<OpenActionRow[]> {
  const { data, error } = await openActions()
    .select(OPEN_ACTION_SELECT)
    .eq('inspection_id', inspectionId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as OpenActionRow[];
}

export async function getOpenActionsByVehicle(vehicleId: string): Promise<OpenActionRow[]> {
  const { data, error } = await openActions()
    .select(OPEN_ACTION_SELECT)
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as OpenActionRow[];
}

export async function getOpenCount(): Promise<number> {
  const { count, error } = await openActions()
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open');
  if (error) throw error;
  return count ?? 0;
}

/** Fetch summary counts grouped by inspection_id (for the inspection list view) */
export async function getActionSummaries(): Promise<Map<string, { total: number; resolved: number }>> {
  const { data, error } = await openActions()
    .select('inspection_id, status');
  if (error) throw error;
  const map = new Map<string, { total: number; resolved: number }>();
  for (const row of (data ?? []) as { inspection_id: string; status: string }[]) {
    const entry = map.get(row.inspection_id) ?? { total: 0, resolved: 0 };
    entry.total++;
    if (row.status === 'resolved') entry.resolved++;
    map.set(row.inspection_id, entry);
  }
  return map;
}

/* ─── Writes ────────────────────────────────────────────────── */

export async function createOpenActions(
  inspectionId: string,
  vehicleId: string,
  deviations: { id: string; item: string; deviation: string }[],
): Promise<void> {
  if (deviations.length === 0) return;
  const rows = deviations.map(d => ({
    inspection_id: inspectionId,
    vehicle_id: vehicleId,
    deviation_id: d.id,
    item: d.item,
    deviation: d.deviation,
    status: 'open',
  }));
  const { error } = await openActions().insert(rows);
  if (error) throw error;
}

export async function resolveAction(
  id: string,
  payload: {
    proof_url: string;
    proof_type: string;
    resolution_notes: string;
    resolved_by: string;
  },
): Promise<OpenActionRow> {
  const { data, error } = await openActions()
    .update({
      status: 'resolved',
      proof_url: payload.proof_url,
      proof_type: payload.proof_type,
      resolution_notes: payload.resolution_notes,
      resolved_by: payload.resolved_by,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(OPEN_ACTION_SELECT)
    .single();
  if (error) throw error;
  return data as OpenActionRow;
}

/* ─── File upload ───────────────────────────────────────────── */

export async function uploadProof(file: File, actionId: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `open-actions/${actionId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('Enprotec')
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) throw new Error(`Proof upload failed: ${error.message}`);
  const { data } = supabase.storage.from('Enprotec').getPublicUrl(path);
  return data.publicUrl;
}
