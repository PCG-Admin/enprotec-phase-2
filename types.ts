export type View = 'Dashboard' | 'Workflows' | 'StockReceipts' | 'Requests' | 'EquipmentManager' | 'RejectedRequests' | 'Picking' | 'Deliveries' | 'Stores' | 'Reports' | 'Users' | 'Sites' | 'MyDeliveries' | 'Returns' | 'Salvage';

export type FormType = 'PR' | 'GateRelease' | 'StockRequest' | 'EPOD' | 'StockIntake' | 'SalvageBooking' | 'ReturnIntake';

export enum Department {
    OEM = 'OEM',
    Operations = 'Operations',
    Projects = 'Projects',
    SalvageYard = 'SalvageYard'
}

export enum StoreType {
  OEM = 'OEM',
  Operations = 'Operations',
  Projects = 'Projects',
  SalvageYard = 'SalvageYard',
}

export const departmentToStoreMap: Record<Department, StoreType> = {
    [Department.OEM]: StoreType.OEM,
    [Department.Operations]: StoreType.Operations,
    [Department.Projects]: StoreType.Projects,
    [Department.SalvageYard]: StoreType.SalvageYard
};

export const storeToDepartmentMap: Record<StoreType, Department> = {
    [StoreType.OEM]: Department.OEM,
    [StoreType.Operations]: Department.Operations,
    [StoreType.Projects]: Department.Projects,
    [StoreType.SalvageYard]: Department.SalvageYard,
};

export enum WorkflowStatus {
  // Core Internal Flow
  REQUEST_SUBMITTED = 'Request Submitted',
  REQUEST_DECLINED = 'Request Declined',
  AWAITING_EQUIP_MANAGER = 'Awaiting Equip. Manager',
  AWAITING_PICKING = 'Awaiting Picking',
  PICKED_AND_LOADED = 'Picked & Loaded',
  DISPATCHED = 'Dispatched',
  EPOD_CONFIRMED = 'EPOD Confirmed',
  COMPLETED = 'Completed',
  REJECTED_AT_DELIVERY = 'Rejected at Delivery',

  // Salvage Flow
  SALVAGE_AWAITING_DECISION = 'Salvage - Awaiting Decision',
  SALVAGE_TO_BE_REPAIRED = 'Salvage - To Be Repaired',
  SALVAGE_REPAIR_CONFIRMED = 'Salvage - Repair Confirmed',
  SALVAGE_TO_BE_SCRAPPED = 'Salvage - To Be Scrapped',
  SALVAGE_SCRAP_CONFIRMED = 'Salvage - Scrap Confirmed',
  SALVAGE_COMPLETE = 'Salvage - Complete',

  // Deprecated/Legacy
  STOCK_CONTROLLER_APPROVAL = 'Awaiting Stock Controller',
  GATE_RELEASE_PENDING = 'Gate Release Pending',

  // External Procurement Flow
  PR_SUBMITTED = 'PR Submitted',
  MANAGER_APPROVAL = 'Manager Approval',
  PO_GENERATED = 'PO Generated',
  SUPPLIER_DELIVERY = 'Supplier Delivery',
  STOCK_INTAKE = 'Stock Controller Intake',
}

export enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
}

export interface WorkflowItem {
  partNumber: string;
  description: string;
  quantityRequested: number;
  quantityOnHand?: number;
}

export interface WorkflowRequest {
  id: string;
  requestNumber: string;
  type: 'Internal' | 'External';
  requester: string;
  requester_id: string;
  projectCode: string;
  department: Department;
  currentStatus: WorkflowStatus;
  priority: Priority;
  createdAt: string;
  items: WorkflowItem[];
  steps: WorkflowStatus[];
  attachmentUrl?: string | null;
  rejectionComment?: string | null;
}

export interface StockItem {
  id: string;
  partNumber: string;
  description: string;
  category: string;
  quantityOnHand: number;
  minStockLevel: number;
  store: StoreType;
  location: string;
  site_id?: string | null;
}

export enum UserRole {
    Admin = 'Admin',
    OperationsManager = 'Operations Manager',
    EquipmentManager = 'Equipment Manager',
    StockController = 'Stock Controller',
    SiteManager = 'Site Manager',
    ProjectManager = 'Project Manager',
    Driver = 'Driver',
    Security = 'Security',
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
    sites: string[] | null;
    status: UserStatus;
    departments: Department[] | null;
}

export enum SiteStatus {
  Active = 'Active',
  Frozen = 'Frozen',
}

export interface Site {
  id: string;
  name: string;
  status: SiteStatus;
}

export interface StockReceipt {
  id: string;
  partNumber: string;
  description: string;
  quantityReceived: number;
  receivedBy: string;
  receivedAt: string;
  store: StoreType;
  deliveryNotePO: string;
  comments?: string | null;
}

export interface WorkflowComment {
    id: string;
    comment_text: string;
    created_at: string;
    user: { name: string; } | null;
}

export interface SalvageRequest {
    id: string;
    stock_item_id: string;
    partNumber: string;
    description: string;
    quantity: number;
    status: WorkflowStatus;
    notes: string | null;
    sourceDepartment?: Department;
    createdBy: string;
    createdAt: string;
    decisionBy: string | null;
    decisionAt: string | null;
}