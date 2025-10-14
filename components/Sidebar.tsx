import React from 'react';
import HomeIcon from './icons/HomeIcon';
import WorkflowIcon from './icons/WorkflowIcon';
import StoreIcon from './icons/StoreIcon';
import ReportsIcon from './icons/ReportsIcon';
import UsersIcon from './icons/UsersIcon';
import CheckSquareIcon from './icons/CheckSquareIcon';
import PackageIcon from './icons/PackageIcon';
import TruckIcon from './icons/TruckIcon';
import UserCheckIcon from './icons/UserCheckIcon';
import XCircleIcon from './icons/XCircleIcon';
import PinIcon from './icons/PinIcon';
import ClipboardCheckIcon from './icons/ClipboardCheckIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import UndoIcon from './icons/UndoIcon';
import WrenchIcon from './icons/WrenchIcon';
import { View, User, UserRole } from '../types';
import EnprotecLogo from './icons/EnprotecLogo';
import ChevronRightIcon from './icons/ChevronRightIcon';

interface SidebarProps {
  user: User;
  currentView: View;
  setCurrentView: (view: View) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const viewPermissions: Record<UserRole, View[]> = {
  [UserRole.Admin]: ['Dashboard', 'FleetDashboard', 'Workflows', 'StockReceipts', 'Requests', 'EquipmentManager', 'RejectedRequests', 'Picking', 'Deliveries', 'MyDeliveries', 'Returns', 'InspectionReport', 'MyInspections', 'Salvage', 'Stores', 'Sites', 'Users', 'Reports'],
  [UserRole.OperationsManager]: ['Dashboard', 'FleetDashboard', 'Workflows', 'StockReceipts', 'Requests', 'EquipmentManager', 'RejectedRequests', 'Picking', 'Deliveries', 'MyDeliveries', 'Returns', 'InspectionReport', 'MyInspections', 'Salvage', 'Stores', 'Sites', 'Reports'],
  [UserRole.EquipmentManager]: ['Dashboard', 'FleetDashboard', 'EquipmentManager', 'RejectedRequests', 'InspectionReport', 'MyInspections', 'Salvage', 'Reports'],
  [UserRole.StockController]: ['Dashboard', 'FleetDashboard', 'StockReceipts', 'Requests', 'RejectedRequests', 'Picking', 'Returns', 'InspectionReport', 'MyInspections', 'Salvage', 'Stores'],
  [UserRole.SiteManager]: ['Dashboard', 'FleetDashboard', 'Workflows', 'Requests', 'MyDeliveries', 'Deliveries', 'InspectionReport', 'MyInspections', 'Stores'],
  [UserRole.ProjectManager]: ['Dashboard', 'FleetDashboard', 'Workflows', 'Requests', 'MyDeliveries', 'Deliveries', 'InspectionReport', 'MyInspections', 'Stores'],
  [UserRole.Driver]: ['Deliveries', 'InspectionReport', 'MyInspections'],
  [UserRole.Security]: ['Deliveries'],
};

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string; 
  isActive: boolean;
  onClick: () => void;
  collapsed: boolean;
}> = ({ icon, label, isActive, onClick, collapsed }) => (
  <li>
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`group relative flex items-center ${collapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-md text-sm font-medium transition-colors duration-200 ${
        isActive
          ? 'bg-zinc-100 text-zinc-900'
          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
      }`}
    >
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500 rounded-r-full"></div>}
      {icon}
      {collapsed ? (
        <span className="pointer-events-none absolute left-full ml-3 rounded-md bg-zinc-900 px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {label}
        </span>
      ) : (
        <span className="ml-3">{label}</span>
      )}
    </a>
  </li>
);

const Sidebar: React.FC<SidebarProps> = ({ user, currentView, setCurrentView, collapsed, onToggle }) => {
  const allNavItems: { label: string; view: View; icon: React.ReactNode }[] = [
    { label: 'Dashboard', view: 'Dashboard', icon: <HomeIcon className="w-5 h-5" /> },
    { label: 'Fleet Dashboard', view: 'FleetDashboard', icon: <ReportsIcon className="w-5 h-5" /> },
    { label: 'Workflows', view: 'Workflows', icon: <WorkflowIcon className="w-5 h-5" /> },
    { label: 'Stock Receipts', view: 'StockReceipts', icon: <ClipboardCheckIcon className="w-5 h-5" /> },
    { label: 'Stock Requests', view: 'Requests', icon: <CheckSquareIcon className="w-5 h-5" /> },
    { label: 'Manager Approvals', view: 'EquipmentManager', icon: <UserCheckIcon className="w-5 h-5" /> },
    { label: 'Picking', view: 'Picking', icon: <PackageIcon className="w-5 h-5" /> },
    { label: 'Deliveries', view: 'Deliveries', icon: <TruckIcon className="w-5 h-5" /> },
    { label: 'My Deliveries', view: 'MyDeliveries', icon: <CheckCircleIcon className="w-5 h-5" /> },
    { label: 'Returns', view: 'Returns', icon: <UndoIcon className="w-5 h-5" /> },
    { label: 'Vehicle Inspection', view: 'InspectionReport', icon: <ClipboardCheckIcon className="w-5 h-5" /> },
    { label: 'My Inspections', view: 'MyInspections', icon: <CheckCircleIcon className="w-5 h-5" /> },
    { label: 'Salvage Store', view: 'Salvage', icon: <WrenchIcon className="w-5 h-5" /> },
    { label: 'Stores', view: 'Stores', icon: <StoreIcon className="w-5 h-5" /> },
    { label: 'Sites', view: 'Sites', icon: <PinIcon className="w-5 h-5" /> },
    { label: 'Users', view: 'Users', icon: <UsersIcon className="w-5 h-5" /> },
    { label: 'Rejected', view: 'RejectedRequests', icon: <XCircleIcon className="w-5 h-5" /> },
    { label: 'Reports', view: 'Reports', icon: <ReportsIcon className="w-5 h-5" /> },
  ];

  const allowedViews = viewPermissions[user.role] || [];
  const visibleNavItems = allNavItems.filter(item => allowedViews.includes(item.view));

  return (
    <aside
      className={`${collapsed ? 'w-20' : 'w-72'} bg-white text-zinc-800 flex flex-col flex-shrink-0 border-r border-zinc-200 transition-all duration-300`}
    >
      <div className={`relative border-b border-zinc-200 ${collapsed ? 'px-3 py-4' : 'px-6 py-6'} overflow-visible`}>
        <div className={`flex flex-col items-center ${collapsed ? 'space-y-3' : 'space-y-4'}`}>
          <img
            src="/Mindrift_Logo-06.png"
            alt="Mindrift"
            className={`${collapsed ? 'max-h-12 max-w-[88px]' : 'max-h-28 w-full max-w-[260px]'} object-contain`}
          />
          <EnprotecLogo className={`${collapsed ? 'h-7' : 'h-12'} w-auto object-contain`} />
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition hover:border-sky-200 hover:text-sky-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronRightIcon className={`h-5 w-5 transform transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <nav className={`flex-1 ${collapsed ? 'px-2' : 'px-4'} py-2`}>
        <ul className="space-y-1">
          {visibleNavItems.map((item) => (
            <NavItem
              key={item.view}
              icon={item.icon}
              label={item.label}
              isActive={currentView === item.view}
              onClick={() => setCurrentView(item.view)}
              collapsed={collapsed}
            />
          ))}
        </ul>
      </nav>
      <div className={`${collapsed ? 'px-2' : 'px-4'} py-4 mt-auto`}>
        {!collapsed && (
          <p className="text-xs text-zinc-400 text-center">
            &copy; 2025 MindRift
          </p>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
