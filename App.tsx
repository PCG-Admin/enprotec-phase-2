import * as React from 'react';
import Sidebar        from './components/Sidebar';
import Header         from './components/Header';
import Login          from './components/Login';
import FleetDashboard from './components/fleet/FleetDashboard';
import Vehicles       from './components/fleet/Vehicles';
import Inspections    from './components/fleet/Inspections';
import Costs          from './components/fleet/Costs';
import Licenses       from './components/fleet/Licenses';
import FleetReports   from './components/fleet/FleetReports';
import Templates      from './components/fleet/Templates';
import Compliance     from './components/fleet/Compliance';
import Administration from './components/fleet/Administration';
import { FleetView, User } from './types';
import { getCurrentUser, onAuthStateChange, signOut } from './supabase/services/auth.service';

const App: React.FC = () => {
  const [user, setUser]                           = React.useState<User | null>(null);
  const [loading, setLoading]                     = React.useState(true);
  const [currentView, setCurrentView]             = React.useState<FleetView>('FleetDashboard');
  const [isSidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [isMobileOpen, setMobileOpen]             = React.useState(false);

  React.useEffect(() => {
    let loaded = false;
    const stopLoading = () => { if (!loaded) { loaded = true; setLoading(false); } };

    // Safety timeout — show login after 4s if Supabase never responds
    const t = setTimeout(stopLoading, 4000);

    getCurrentUser()
      .then(u => { setUser(u); stopLoading(); })
      .catch(() => stopLoading());

    const unsub = onAuthStateChange(u => {
      setUser(u);
      stopLoading();
    });

    return () => { unsub(); clearTimeout(t); };
  }, []);

  const navigate = (view: FleetView) => {
    setCurrentView(view);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setCurrentView('FleetDashboard');
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-zinc-100">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-zinc-500 font-medium">Loading…</p>
      </div>
    </div>
  );

  if (!user) return <Login onLogin={setUser} />;

  const renderView = () => {
    switch (currentView) {
      case 'FleetDashboard':  return <FleetDashboard user={user} />;
      case 'Vehicles':        return <Vehicles />;
      case 'Inspections':     return <Inspections user={user} />;
      case 'Costs':           return <Costs />;
      case 'Licenses':        return <Licenses />;
      case 'FleetReports':    return <FleetReports />;
      case 'Templates':       return <Templates user={user} />;
      case 'Compliance':      return <Compliance />;
      case 'Administration':  return <Administration currentUser={user} />;
      default:                return <FleetDashboard user={user} />;
    }
  };

  return (
    <div className="flex h-screen bg-zinc-100 font-sans overflow-hidden">
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        user={user}
        currentView={currentView}
        setCurrentView={navigate}
        collapsed={isSidebarCollapsed}
        onToggle={() => setSidebarCollapsed(prev => !prev)}
        mobileOpen={isMobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          user={user}
          onLogout={handleLogout}
          onMobileMenuToggle={() => setMobileOpen(prev => !prev)}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-zinc-100 p-4 md:p-8">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;
