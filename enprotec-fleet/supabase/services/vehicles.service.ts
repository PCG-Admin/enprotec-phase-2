import { supabase } from '../client';
import type { VehicleRow } from '../database.types';

export type VehicleInsert = Omit<VehicleRow, 'id' | 'created_at' | 'updated_at'>;
export type VehicleUpdate = Partial<VehicleInsert>;

export async function getVehicles(): Promise<VehicleRow[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('registration');
  if (error) throw error;
  return data ?? [];
}

export async function getVehicle(id: string): Promise<VehicleRow | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createVehicle(vehicle: VehicleInsert): Promise<VehicleRow> {
  const { data, error } = await supabase
    .from('vehicles')
    .insert(vehicle)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateVehicle(id: string, updates: VehicleUpdate): Promise<VehicleRow> {
  const { data, error } = await supabase
    .from('vehicles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) throw error;
}

/** Upload a vehicle photo to storage and return its public URL */
export async function uploadVehiclePhoto(file: File, vehicleId: string): Promise<string> {
  const ext  = file.name.split('.').pop();
  const path = `${vehicleId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('vehicle-photos').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('vehicle-photos').getPublicUrl(path);
  return data.publicUrl;
}
