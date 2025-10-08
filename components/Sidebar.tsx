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
import MindriftLogo from './icons/MindriftLogo';

interface SidebarProps {
  user: User;
  currentView: View;
  setCurrentView: (view: View) => void;
}

const viewPermissions: Record<UserRole, View[]> = {
  [UserRole.Admin]: ['Dashboard', 'Workflows', 'StockReceipts', 'Requests', 'EquipmentManager', 'RejectedRequests', 'Picking', 'Deliveries', 'MyDeliveries', 'Returns', 'Salvage', 'Stores', 'Sites', 'Users', 'Reports'],
  [UserRole.OperationsManager]: ['Dashboard', 'Workflows', 'StockReceipts', 'Requests', 'EquipmentManager', 'RejectedRequests', 'Picking', 'Deliveries', 'MyDeliveries', 'Returns', 'Salvage', 'Stores', 'Sites', 'Reports'],
  [UserRole.EquipmentManager]: ['Dashboard', 'Workflows', 'EquipmentManager', 'RejectedRequests', 'Salvage', 'Reports'],
  [UserRole.StockController]: ['Dashboard', 'Workflows', 'StockReceipts', 'Requests', 'RejectedRequests', 'Picking', 'Returns', 'Salvage', 'Stores'],
  [UserRole.SiteManager]: ['Dashboard', 'Workflows', 'Requests', 'MyDeliveries', 'Stores', 'Deliveries'],
  [UserRole.ProjectManager]: ['Dashboard', 'Workflows', 'Requests', 'MyDeliveries', 'Stores', 'Deliveries'],
  [UserRole.Driver]: ['Deliveries'],
  [UserRole.Security]: ['Deliveries'],
};

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string; 
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <li>
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors duration-200 relative ${
        isActive
          ? 'bg-zinc-100 text-zinc-900'
          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
      }`}
    >
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500 rounded-r-full"></div>}
      {icon}
      <span className="ml-3">{label}</span>
    </a>
  </li>
);

const Sidebar: React.FC<SidebarProps> = ({ user, currentView, setCurrentView }) => {
  const allNavItems: { label: string; view: View; icon: React.ReactNode }[] = [
    { label: 'Dashboard', view: 'Dashboard', icon: <HomeIcon className="w-5 h-5" /> },
    { label: 'Workflows', view: 'Workflows', icon: <WorkflowIcon className="w-5 h-5" /> },
    { label: 'Stock Receipts', view: 'StockReceipts', icon: <ClipboardCheckIcon className="w-5 h-5" /> },
    { label: 'Stock Requests', view: 'Requests', icon: <CheckSquareIcon className="w-5 h-5" /> },
    { label: 'Manager Approvals', view: 'EquipmentManager', icon: <UserCheckIcon className="w-5 h-5" /> },
    { label: 'Picking', view: 'Picking', icon: <PackageIcon className="w-5 h-5" /> },
    { label: 'Deliveries', view: 'Deliveries', icon: <TruckIcon className="w-5 h-5" /> },
    { label: 'My Deliveries', view: 'MyDeliveries', icon: <CheckCircleIcon className="w-5 h-5" /> },
    { label: 'Returns', view: 'Returns', icon: <UndoIcon className="w-5 h-5" /> },
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
    <aside className="w-64 bg-white text-zinc-800 flex flex-col flex-shrink-0 border-r border-zinc-200">
      <div className="h-20 flex flex-col items-center justify-center px-6 border-b border-zinc-200 space-y-2 py-2">
        <MindriftLogo className="h-18 w-auto" />
        <EnprotecLogo className="h-5 w-auto" />
      </div>
      <nav className="flex-1 px-4 py-2">
        <ul className="space-y-1">
          {visibleNavItems.map((item) => (
            <NavItem
              key={item.view}
              icon={item.icon}
              label={item.label}
              isActive={currentView === item.view}
              onClick={() => setCurrentView(item.view)}
            />
          ))}
        </ul>
      </nav>
      <div className="p-4 mt-auto">
        <p className="text-xs text-zinc-400 text-center">
          &copy; 2025 MindRift
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;