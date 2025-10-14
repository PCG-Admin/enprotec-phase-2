import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import WorkflowList from './components/WorkflowList';
import StockManagement from './components/StockManagement';
import Reports from './components/Reports';
import Users from './components/Users';
import Login from './components/Login';
import Requests from './components/Requests';
import Picking from './components/Picking';
import Deliveries from './components/Deliveries';
import EquipmentManager from './components/EquipmentManager';
import RejectedRequests from './components/RejectedRequests';
import Sites from './components/Sites';
import StockReceipts from './components/StockReceipts';
import MyDeliveries from './components/MyDeliveries';
import Returns from './components/Returns';
import SalvagePage from './components/SalvagePage';
import InspectionReport from './components/InspectionReport';
import MyInspections from './components/MyInspections';
import FleetDashboard from './components/FleetDashboard';
import { View, FormType, User, UserRole, WorkflowRequest, StockItem } from './types';
import PRForm from './components/forms/PRForm';
import GateReleaseForm from './components/forms/GateReleaseForm';
import StockRequestForm from './components/forms/StockRequestForm';
import EPODForm from './components/forms/EPODForm';
import StockIntakeForm from './components/forms/StockIntakeForm';
import SalvageBookingForm from './components/forms/SalvageBookingForm';

// Role-Based Access Control Configuration
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

const getDefaultViewForRole = (role: UserRole): View => {
  const allowedViews = viewPermissions[role];
  // Always default to Dashboard if the user has access to it.
  if (allowedViews.includes('Dashboard')) {
    return 'Dashboard';
  }
  // Fallback for roles without Dashboard access (e.g., Driver/Security).
  if (allowedViews.includes('Deliveries')) {
    return 'Deliveries';
  }
  // Failsafe to return the first-ever available view.
  return allowedViews[0] || 'Dashboard';
};

const canAccessView = (role: UserRole, view: View): boolean => {
  return viewPermissions[role]?.includes(view) ?? false;
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('Dashboard');
  const [activeForm, setActiveForm] = useState<{ type: FormType; context?: any } | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [showInspectionToast, setShowInspectionToast] = useState(false);

  const triggerRefresh = () => setDataVersion(v => v + 1);

  const handleLoginSuccess = (user: User) => {
    setLoggedInUser(user);
    setCurrentView(getDefaultViewForRole(user.role));
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('enprotec:user', JSON.stringify(user));
    }
  };

  const navigateTo = (view: View) => {
    if (view !== 'MyInspections') {
      setShowInspectionToast(false);
    }
    setCurrentView(view);
  };
  
  const openForm = (type: FormType, context?: any) => {
    setActiveForm({ type, context });
  };

  const closeForm = () => {
    setActiveForm(null);
  };
  
  const handleFormSuccess = () => {
    closeForm();
    triggerRefresh();
  };


  const handleLogout = () => {
    setLoggedInUser(null);
    setCurrentView('Dashboard');
    setShowInspectionToast(false);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('enprotec:user');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedUser = window.localStorage.getItem('enprotec:user');
    if (!storedUser) return;

    try {
      const parsedUser = JSON.parse(storedUser) as User;
      setLoggedInUser(parsedUser);
      setCurrentView(prev => {
        if (canAccessView(parsedUser.role, prev)) {
          return prev;
        }
        return getDefaultViewForRole(parsedUser.role);
      });
    } catch (error) {
      console.warn('Failed to restore user session from storage', error);
      window.localStorage.removeItem('enprotec:user');
    }
  }, []);

  const handleInspectionSuccess = () => {
    setShowInspectionToast(true);
    setCurrentView('MyInspections');
  };

  const renderView = () => {
    if (!loggedInUser || !canAccessView(loggedInUser.role, currentView)) {
        const defaultView = loggedInUser ? getDefaultViewForRole(loggedInUser.role) : 'Dashboard';
        if (currentView !== defaultView) {
            setCurrentView(defaultView);
        }
        return <Dashboard openForm={openForm} user={loggedInUser!} navigateTo={navigateTo} />;
    }

    switch (currentView) {
      case 'Dashboard':
        return <Dashboard openForm={openForm} user={loggedInUser} navigateTo={navigateTo} />;
      case 'Workflows':
        return <WorkflowList user={loggedInUser} />;
      case 'StockReceipts':
        return <StockReceipts openForm={openForm} user={loggedInUser} />;
      case 'Requests':
        return <Requests user={loggedInUser} openForm={openForm} onDataChange={triggerRefresh} />;
      case 'EquipmentManager':
        return <EquipmentManager user={loggedInUser} onDataChange={triggerRefresh} />;
      case 'RejectedRequests':
        return <RejectedRequests user={loggedInUser} />;
      case 'Picking':
        return <Picking user={loggedInUser} onDataChange={triggerRefresh} dataVersion={dataVersion} />;
      case 'Deliveries':
        return <Deliveries user={loggedInUser} openForm={openForm} dataVersion={dataVersion} />;
      case 'MyDeliveries':
        return <MyDeliveries user={loggedInUser} onDataChange={triggerRefresh} dataVersion={dataVersion} />;
      case 'Returns':
        return <Returns user={loggedInUser} openForm={openForm} />;
       case 'Salvage':
        return <SalvagePage user={loggedInUser} />;
      case 'Stores':
        return <StockManagement user={loggedInUser} openForm={openForm} />;
      case 'Sites':
        return <Sites />;
      case 'Reports':
        return <Reports user={loggedInUser} />;
      case 'Users':
        return <Users />;
      case 'InspectionReport':
        return <InspectionReport user={loggedInUser} onSuccess={handleInspectionSuccess} />;
      case 'MyInspections':
        return (
          <MyInspections
            user={loggedInUser}
            showSuccessToast={showInspectionToast}
            onDismissToast={() => setShowInspectionToast(false)}
            onCreateNew={() => navigateTo('InspectionReport')}
          />
        );
      case 'FleetDashboard':
        return <FleetDashboard user={loggedInUser} />;
      default:
        return <Dashboard openForm={openForm} user={loggedInUser} navigateTo={navigateTo} />;
    }
  };

  const renderFormModal = () => {
    if (!activeForm || !loggedInUser) return null;

    const formProps = {
        user: loggedInUser,
        onSuccess: handleFormSuccess,
        onCancel: closeForm,
    };
    
    switch (activeForm.type) {
        case 'StockRequest':
            return <StockRequestForm {...formProps} />;
        case 'StockIntake':
            return <StockIntakeForm {...formProps} />;
        case 'GateRelease':
            return <GateReleaseForm {...formProps} workflow={activeForm.context as WorkflowRequest} />;
        case 'EPOD':
            return <EPODForm {...formProps} workflow={activeForm.context as WorkflowRequest} />;
        case 'SalvageBooking':
            return <SalvageBookingForm {...formProps} stockItem={activeForm.context as StockItem} />;
        case 'ReturnIntake':
            return <StockIntakeForm {...formProps} returnWorkflow={activeForm.context as WorkflowRequest} />;
        case 'PR':
            return <PRForm {...formProps} />;
        default:
            return null;
    }
  }

  if (!loggedInUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-zinc-100 font-sans">
      <Sidebar user={loggedInUser} currentView={currentView} setCurrentView={navigateTo} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={loggedInUser} onLogout={handleLogout} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-zinc-100 p-8">
          {renderView()}
        </main>
        {activeForm && (
             <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
                <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-lg">
                   {renderFormModal()}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default App;
