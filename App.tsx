import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import WorkflowList from './components/WorkflowList';
import StockManagement from './components/StockManagement';
import Reports from './components/Reports';
import Users from './components/Users';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import Requests from './components/Requests';
import Picking from './components/Picking';
import Deliveries from './components/Deliveries';
import EquipmentManager from './components/EquipmentManager';
import RejectedRequests from './components/RejectedRequests';
import Sites from './components/Sites';
import Departments from './components/Departments';
import StockReceipts from './components/StockReceipts';
import MyDeliveries from './components/MyDeliveries';
import SalvagePage from './components/SalvagePage';
import InspectionReport from './components/InspectionReport';
import MyInspections from './components/MyInspections';
import StockReports from './components/StockReports';
import { View, FormType, User, UserRole, WorkflowRequest, StockItem } from './types';
import PRForm from './components/forms/PRForm';
import GateReleaseForm from './components/forms/GateReleaseForm';
import StockRequestForm from './components/forms/StockRequestForm';
import EPODForm from './components/forms/EPODForm';
import StockIntakeForm from './components/forms/StockIntakeForm';
import SalvageBookingForm from './components/forms/SalvageBookingForm';
import { supabase } from './supabase/client';
import { fetchUserProfile } from './services/userProfile';

const STORAGE_USER_KEY = 'enprotec:user';
const STORAGE_VIEW_KEY = 'enprotec:view';
const FETCH_PROFILE_TIMEOUT_MS = 15000;

const readStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch (error) {
    console.warn('[Auth] Failed to parse stored user, clearing cache', error);
    window.localStorage.removeItem(STORAGE_USER_KEY);
    return null;
  }
};

const readStoredView = (): View | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_VIEW_KEY);
  return raw ? (raw as View) : null;
};

type ProfileLoadResult =
  | { status: 'ok'; profile: User }
  | { status: 'missing' }
  | { status: 'timeout' }
  | { status: 'error' };

const profileTimeoutToken = Symbol('profile-timeout');

const fetchProfileWithTimeout = async (userId: string): Promise<ProfileLoadResult> => {
  try {
    const result = await Promise.race<User | null | symbol>([
      fetchUserProfile(userId),
      new Promise<symbol>(resolve =>
        setTimeout(() => resolve(profileTimeoutToken), FETCH_PROFILE_TIMEOUT_MS)
      ),
    ]);

    if (result === profileTimeoutToken) {
      console.warn('[Auth] fetchUserProfile timed out');
      return { status: 'timeout' };
    }

    if (!result) {
      return { status: 'missing' };
    }

    return { status: 'ok', profile: result };
  } catch (error) {
    console.error('[Auth] fetchUserProfile failed', error);
    return { status: 'error' };
  }
};

// Role-Based Access Control Configuration
const viewPermissions: Record<UserRole, View[]> = {
  [UserRole.Admin]: ['Dashboard', 'Workflows', 'StockReceipts', 'Requests', 'EquipmentManager', 'RejectedRequests', 'Picking', 'Deliveries', 'MyDeliveries', 'InspectionReport', 'MyInspections', 'Salvage', 'Stock', 'Sites', 'Stores', 'Users', 'Reports', 'StockReports'],
  [UserRole.OperationsManager]: ['Dashboard', 'Workflows', 'StockReceipts', 'Requests', 'EquipmentManager', 'RejectedRequests', 'Picking', 'Deliveries', 'MyDeliveries', 'InspectionReport', 'MyInspections', 'Salvage', 'Stock', 'Sites', 'Reports'],
  [UserRole.EquipmentManager]: ['Dashboard', 'Workflows', 'StockReceipts', 'Requests', 'EquipmentManager', 'RejectedRequests', 'InspectionReport', 'MyInspections', 'Salvage', 'Stock', 'Reports'],
  [UserRole.StockController]: ['Dashboard', 'Workflows', 'StockReceipts', 'Requests', 'RejectedRequests', 'Picking', 'InspectionReport', 'MyInspections', 'Salvage', 'Stock', 'StockReports'],
  [UserRole.Storeman]: ['Dashboard', 'Workflows', 'Stock', 'Picking'],
  [UserRole.SiteManager]: ['Dashboard', 'Workflows', 'Requests', 'MyDeliveries', 'Deliveries', 'InspectionReport', 'MyInspections', 'Stock'],
  [UserRole.ProjectManager]: ['Dashboard', 'Workflows', 'Requests', 'MyDeliveries', 'Deliveries', 'InspectionReport', 'MyInspections', 'Stock'],
  [UserRole.Driver]: ['Dashboard', 'Workflows', 'Deliveries', 'InspectionReport', 'MyInspections'],
  [UserRole.Security]: ['Dashboard', 'Workflows', 'Deliveries'],
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
  const [loggedInUser, setLoggedInUser] = useState<User | null>(() => readStoredUser());
  const [currentView, setCurrentView] = useState<View>(() => {
    const storedUser = readStoredUser();
    const storedView = readStoredView();

    if (storedUser && storedView && canAccessView(storedUser.role, storedView)) {
      return storedView;
    }

    if (storedUser) {
      return getDefaultViewForRole(storedUser.role);
    }

    return storedView ?? 'Dashboard';
  });
  const [activeForm, setActiveForm] = useState<{ type: FormType; context?: any } | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [showInspectionToast, setShowInspectionToast] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [initialisingAuth, setInitialisingAuth] = useState(() => !readStoredUser());

  const triggerRefresh = () => setDataVersion(v => v + 1);

  const handleLoginSuccess = (user: User) => {
    const defaultView = getDefaultViewForRole(user.role);
    setLoggedInUser(user);
    setCurrentView(defaultView);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
      window.localStorage.setItem(STORAGE_VIEW_KEY, defaultView);
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


  const handleLogout = async () => {
    console.info('[Auth] logout requested');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[Auth] signOut error', error);
      } else {
        console.info('[Auth] signOut succeeded');
      }
    } catch (error) {
      console.error('[Auth] signOut threw', error);
    } finally {
      setLoggedInUser(null);
      setCurrentView('Dashboard');
      setShowInspectionToast(false);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_USER_KEY);
        window.localStorage.removeItem(STORAGE_VIEW_KEY);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initialiseSession = async () => {
      console.info('[Auth] initialiseSession start');
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        console.info('[Auth] getSession result', session ? 'session-present' : 'no-session', error);

        if (error) {
          console.error('[Auth] getSession error', error);
        }

        if (!session) {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(STORAGE_USER_KEY);
            window.localStorage.removeItem(STORAGE_VIEW_KEY);
          }
          setLoggedInUser(null);
          return;
        }

        const profileResult = await fetchProfileWithTimeout(session.user.id);
        if (cancelled) return;

        if (profileResult.status === 'timeout') {
          console.warn('[Auth] initialiseSession profile lookup timed out');
          return;
        }

        if (profileResult.status !== 'ok') {
          console.warn('[Auth] initialiseSession profile missing or errored, signing out');
          await supabase.auth.signOut();
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(STORAGE_USER_KEY);
            window.localStorage.removeItem(STORAGE_VIEW_KEY);
          }
          setLoggedInUser(null);
          return;
        }

        const profile = profileResult.profile;
        setLoggedInUser(profile);
        setCurrentView(prev => {
          if (canAccessView(profile.role, prev)) {
            return prev;
          }
          return getDefaultViewForRole(profile.role);
        });
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(profile));
        }
      } catch (error) {
        console.error('[Auth] initialiseSession error', error);
        setLoggedInUser(null);
      } finally {
        setInitialisingAuth(false);
      }
    };

    initialiseSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.info('[Auth] onAuthStateChange', { event, hasSession: Boolean(session) });
      if (cancelled) return;
      if (!session) {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(STORAGE_USER_KEY);
          window.localStorage.removeItem(STORAGE_VIEW_KEY);
        }
        setLoggedInUser(null);
        setCurrentView('Dashboard');
        setInitialisingAuth(false);
        return;
      }

      const profileResult = await fetchProfileWithTimeout(session.user.id);
      if (profileResult.status === 'timeout') {
        console.warn('[Auth] auth change profile lookup timed out');
        return;
      }

      if (profileResult.status !== 'ok') {
        console.warn('[Auth] auth change profile missing, signing out');
        await supabase.auth.signOut();
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(STORAGE_USER_KEY);
          window.localStorage.removeItem(STORAGE_VIEW_KEY);
        }
        setLoggedInUser(null);
        setCurrentView('Dashboard');
        setInitialisingAuth(false);
        return;
      }

      console.info('[Auth] auth change profile loaded');
      const profile = profileResult.profile;
      setLoggedInUser(profile);
      setCurrentView(prev => {
        if (canAccessView(profile.role, prev)) {
          return prev;
        }
        return getDefaultViewForRole(profile.role);
      });
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(profile));
      }
      setInitialisingAuth(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!loggedInUser) {
      window.localStorage.removeItem(STORAGE_VIEW_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_VIEW_KEY, currentView);
  }, [currentView, loggedInUser]);

  const isResetPasswordRoute = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.location.pathname === '/reset-password';
  }, []);

  const handleInspectionSuccess = () => {
    setShowInspectionToast(true);
    setCurrentView('MyInspections');
  };

  if (isResetPasswordRoute) {
    return <ResetPassword />;
  }

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
        return <Requests user={loggedInUser} openForm={openForm} onDataChange={triggerRefresh} dataVersion={dataVersion} />;
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
       case 'Salvage':
        return <SalvagePage user={loggedInUser} />;
      case 'Stock':
        return <StockManagement user={loggedInUser} openForm={openForm} />;
      case 'Sites':
        return <Sites />;
      case 'Stores':
        return <Departments />;
      case 'Reports':
        return <Reports user={loggedInUser} />;
      case 'StockReports':
        return <StockReports user={loggedInUser} />;
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
        case 'SalvageBooking': {
            const ctx = activeForm.context as
                | StockItem
                | { stockItem: StockItem; maxQuantity?: number; workflowId?: string };
            if ((ctx as any)?.stockItem) {
                const { stockItem, maxQuantity, workflowId } = ctx as {
                    stockItem: StockItem;
                    maxQuantity?: number;
                    workflowId?: string;
                };
                return <SalvageBookingForm {...formProps} stockItem={stockItem} maxQuantity={maxQuantity} workflowId={workflowId} />;
            }
            return <SalvageBookingForm {...formProps} stockItem={ctx as StockItem} />;
        }
        case 'ReturnIntake':
            return <StockIntakeForm {...formProps} returnWorkflow={activeForm.context as WorkflowRequest} />;
        case 'PR':
            return <PRForm {...formProps} />;
        default:
            return null;
    }
  }

  if (initialisingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-100 text-zinc-500">
        <span>Loading…</span>
      </div>
    );
  }

  if (!loggedInUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-zinc-100 font-sans">
      <Sidebar
        user={loggedInUser}
        currentView={currentView}
        setCurrentView={navigateTo}
        collapsed={isSidebarCollapsed}
        onToggle={() => setSidebarCollapsed(prev => !prev)}
      />
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
