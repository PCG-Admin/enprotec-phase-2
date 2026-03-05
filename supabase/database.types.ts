export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type UserRole      = 'Admin' | 'Fleet Coordinator' | 'Driver';
export type UserStatus    = 'Active' | 'Inactive';
export type VehicleStatus = 'Active' | 'In Maintenance' | 'Inactive' | 'Decommissioned';
export type LicenseCat    = 'Vehicle' | 'Driver';
export type CostCat       = 'Fuel' | 'Maintenance' | 'Tyres' | 'Insurance' | 'Licensing' | 'Other';
export type CompStatus    = 'Overdue' | 'Due Soon' | 'Scheduled' | 'Completed';
export type SiteStatus    = 'Active' | 'Inactive';
export type InspResult    = 'pass' | 'fail' | 'requires_attention' | 'in_progress';
export type InspFreq      = 'daily' | 'weekly' | 'monthly' | 'custom';

/* ─── Question shape stored in JSONB ────────────────────────── */
export interface DbQuestion {
  id: string;
  text: string;
  type: 'checkbox' | 'text' | 'number' | 'select' | 'photo';
  required: boolean;
  unit?: string;
  options?: string[];
}

/* ─── Database row shapes ────────────────────────────────────── */
export interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface SiteRow {
  id: string;
  name: string;
  location: string;
  contact: string | null;
  status: SiteStatus;
  created_at: string;
  updated_at: string;
}

export interface VehicleRow {
  id: string;
  registration: string;
  make: string;
  model: string;
  vehicle_type: string;
  year: number | null;
  vin: string | null;
  serial_number: string | null;
  fuel_type: string | null;
  current_hours: number;
  current_mileage: number;
  site_id: string | null;
  site_name: string | null;
  assigned_driver: string | null;
  purchase_date: string | null;
  acquisition_cost: number | null;
  last_inspection_date: string | null;
  next_inspection_date: string | null;
  status: VehicleStatus;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateRow {
  id: string;
  name: string;
  description: string;
  frequency: InspFreq;
  questions: DbQuestion[];
  active: boolean;
  last_used: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InspectionRow {
  id: string;
  template_id: string | null;
  vehicle_id: string;
  vehicle_reg: string | null;
  inspector_id: string | null;
  inspector_name: string | null;
  inspection_type: string;
  started_at: string;
  completed_at: string | null;
  status: InspResult;
  answers: Json;
  notes: string | null;
  odometer: number | null;
  hour_meter: number | null;
  signature_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LicenseRow {
  id: string;
  category: LicenseCat;
  vehicle_id: string | null;
  driver_name: string | null;
  driver_employee_id: string | null;
  license_type: string;
  license_number: string;
  issue_date: string;
  expiry_date: string;
  notes: string | null;
  document_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CostRow {
  id: string;
  vehicle_id: string;
  vehicle_registration: string | null;
  date: string;
  category: CostCat;
  amount: number;
  description: string;
  supplier: string | null;
  invoice_number: string | null;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceRow {
  id: string;
  vehicle_id: string;
  vehicle_registration: string | null;
  inspection_type: string;
  due_date: string;
  scheduled_date: string | null;
  completed_date: string | null;
  status: CompStatus;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditRow {
  id: string;
  user_id: string | null;
  user_name: string;
  action: string;
  module: string;
  details: string;
  created_at: string;
}

/* ─── Database interface for typed Supabase client ──────────── */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProfileRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      sites: {
        Row: SiteRow;
        Insert: Omit<SiteRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SiteRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      vehicles: {
        Row: VehicleRow;
        Insert: Omit<VehicleRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<VehicleRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      inspection_templates: {
        Row: TemplateRow;
        Insert: Omit<TemplateRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TemplateRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      inspections: {
        Row: InspectionRow;
        Insert: Omit<InspectionRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<InspectionRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      licenses: {
        Row: LicenseRow;
        Insert: Omit<LicenseRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<LicenseRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      costs: {
        Row: CostRow;
        Insert: Omit<CostRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CostRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      compliance_schedule: {
        Row: ComplianceRow;
        Insert: Omit<ComplianceRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ComplianceRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      audit_log: {
        Row: AuditRow;
        Insert: Omit<AuditRow, 'id' | 'created_at'>;
        Update: never;
      };
    };
    Functions: {
      get_user_role: { Args: Record<never, never>; Returns: string };
    };
  };
}
