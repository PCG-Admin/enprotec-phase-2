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

// Matches the role values stored in en_users.role
export enum UserRole {
  Admin             = 'Admin',
  OperationsManager = 'Operations Manager',
  EquipmentManager  = 'Equipment Manager',
  StockController   = 'Stock Controller',
  Storeman          = 'Storeman',
  SiteManager       = 'Site Manager',
  ProjectManager    = 'Project Manager',
  Driver            = 'Driver',
  Security          = 'Security',
}

export enum UserStatus {
  Active   = 'Active',
  Inactive = 'Inactive',
}

export interface User {
  id:           string;
  name:         string;
  email:        string;
  role:         string;          // raw string from en_users — covers all role variants
  status:       UserStatus;
  fleet_access: boolean;         // new column in en_users
  sites?:       string[] | null;
  departments?: string[] | null;
}

export interface Site {
  id:           string;
  name:         string;
  location:     string;
  contact?:     string;
  vehicleCount?: number;
  status:       'Active' | 'Inactive';
}

export interface AuditEntry {
  id:        string;
  timestamp: string;
  user:      string;
  action:    string;
  module:    string;
  details:   string;
}

/** Determine which module(s) a user can access after login */
export type ModuleAccess = 'fleet' | 'operations' | 'chooser';

export function getModuleAccess(user: User): ModuleAccess {
  const role = user.role;
  if (role === UserRole.Admin) return 'chooser';      // admin picks
  if (role === UserRole.Driver) return 'fleet';        // drivers → fleet inspections only
  if (user.fleet_access)        return 'chooser';      // manager with fleet access — can pick
  return 'operations';                                 // everyone else → ops only
}
