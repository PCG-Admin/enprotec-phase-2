export type FleetView =
  | 'FleetDashboard'
  | 'Vehicles'
  | 'Inspections'
  | 'Costs'
  | 'Licenses'
  | 'FleetReports'
  | 'Templates'
  | 'Compliance'
  | 'Administration';

export enum UserRole {
  Admin = 'Admin',
  Driver = 'Driver',
  FleetCoordinator = 'Fleet Coordinator',
}

export enum UserStatus {
  Active = 'Active',
  Inactive = 'Inactive',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface Site {
  id: string;
  name: string;
  location: string;
  contact?: string;
  vehicleCount?: number;
  status: 'Active' | 'Inactive';
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  details: string;
}
