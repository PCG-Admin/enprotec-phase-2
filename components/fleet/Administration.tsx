import * as React from 'react';
import {
  Plus, Edit2, Trash2, X, Search, MapPin,
  Shield, ToggleLeft, ToggleRight, Loader2, AlertCircle,
} from 'lucide-react';
import type { User } from '../../types';
import { UserRole } from '../../types';
import type { ProfileRow, SiteRow, AuditRow, UserStatus } from '../../supabase/database.types';
import { getProfiles, updateProfile, setUserStatus } from '../../supabase/services/profiles.service';
import { createFleetUser, deleteFleetUser } from '../../supabase/services/auth.service';
import { getSites, createSite, updateSite, deleteSite } from '../../supabase/services/sites.service';
import { getAuditLog } from '../../supabase/services/audit.service';

const TABS = ['Users', 'Sites', 'Settings', 'Audit Log'];

const ACTION_COLORS: Record<string, string> = {
  Created:  'bg-green-100 text-green-700',
  Added:    'bg-green-100 text-green-700',
  Updated:  'bg-blue-100 text-blue-700',
  Uploaded: 'bg-blue-100 text-blue-700',
  Deleted:  'bg-red-100 text-red-700',
  Login:    'bg-gray-100 text-gray-600',
};

const ROLES: UserRole[] = [UserRole.Admin, UserRole.FleetCoordinator, UserRole.Driver];

interface AdministrationProps {
  currentUser: User;
}

const Administration: React.FC<AdministrationProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = React.useState(0);

  // ── Users state ──────────────────────────────────────────────────────────
  const [profiles, setProfiles]         = React.useState<ProfileRow[]>([]);
  const [usersLoading, setUsersLoading] = React.useState(true);
  const [usersError, setUsersError]     = React.useState<string | null>(null);
  const [searchUser, setSearchUser]     = React.useState('');
  const [showUserModal, setShowUserModal]   = React.useState(false);
  const [editingProfile, setEditingProfile] = React.useState<ProfileRow | null>(null);
  const [userForm, setUserForm] = React.useState({ name: '', email: '', password: '', role: UserRole.Driver as UserRole });
  const [userSaving, setUserSaving]     = React.useState(false);
  const [userSaveErr, setUserSaveErr]   = React.useState<string | null>(null);

  // ── Sites state ──────────────────────────────────────────────────────────
  const [sites, setSites]               = React.useState<SiteRow[]>([]);
  const [sitesLoading, setSitesLoading] = React.useState(true);
  const [sitesError, setSitesError]     = React.useState<string | null>(null);
  const [searchSite, setSearchSite]     = React.useState('');
  const [showSiteModal, setShowSiteModal]   = React.useState(false);
  const [editingSite, setEditingSite]       = React.useState<SiteRow | null>(null);
  const [siteForm, setSiteForm] = React.useState({ name: '', location: '', contact: '' });
  const [siteSaving, setSiteSaving]     = React.useState(false);
  const [siteSaveErr, setSiteSaveErr]   = React.useState<string | null>(null);

  // ── Audit state ──────────────────────────────────────────────────────────
  const [auditLog, setAuditLog]           = React.useState<AuditRow[]>([]);
  const [auditLoading, setAuditLoading]   = React.useState(false);
  const [auditLoaded, setAuditLoaded]     = React.useState(false);

  // ── Settings state (local-only for now) ──────────────────────────────────
  const [settings, setSettings] = React.useState({
    companyName:         'Enprotec',
    notifyOverdue:       true,
    notifyLicenseExpiry: true,
    notifyCostThreshold: false,
    costThreshold:       '50000',
    defaultFrequency:    'Monthly',
  });

  // ── Load data ────────────────────────────────────────────────────────────
  React.useEffect(() => {
    getProfiles()
      .then(p => setProfiles(p))
      .catch(e => setUsersError(e.message ?? 'Failed to load users'))
      .finally(() => setUsersLoading(false));

    getSites()
      .then(s => setSites(s))
      .catch(e => setSitesError(e.message ?? 'Failed to load sites'))
      .finally(() => setSitesLoading(false));
  }, []);

  // Load audit log lazily when tab is opened
  React.useEffect(() => {
    if (activeTab === 3 && !auditLoaded) {
      setAuditLoading(true);
      getAuditLog(100)
        .then(a => { setAuditLog(a); setAuditLoaded(true); })
        .catch(() => {})
        .finally(() => setAuditLoading(false));
    }
  }, [activeTab, auditLoaded]);

  // Access guard
  if (currentUser.role !== UserRole.Admin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <p className="text-lg font-medium text-gray-900">Access Restricted</p>
          <p className="text-gray-500 mt-1">Administration is available to Admins only.</p>
        </div>
      </div>
    );
  }

  // ── User helpers ─────────────────────────────────────────────────────────
  const filteredUsers = profiles.filter(u =>
    u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const openUserModal = (profile?: ProfileRow) => {
    setUserSaveErr(null);
    setEditingProfile(profile ?? null);
    setUserForm(profile
      ? { name: profile.name, email: profile.email, password: '', role: profile.role as UserRole }
      : { name: '', email: '', password: '', role: UserRole.Driver }
    );
    setShowUserModal(true);
  };

  const saveUser = async () => {
    if (!userForm.name || !userForm.email) return;
    setUserSaving(true);
    setUserSaveErr(null);
    try {
      if (editingProfile) {
        const updated = await updateProfile(editingProfile.id, { name: userForm.name, role: userForm.role as any });
        setProfiles(p => p.map(u => u.id === editingProfile.id ? updated : u));
      } else {
        if (!userForm.password || userForm.password.length < 6) {
          setUserSaveErr('Password must be at least 6 characters.');
          setUserSaving(false);
          return;
        }
        const { error } = await createFleetUser(userForm.email, userForm.password, userForm.name, userForm.role);
        if (error) { setUserSaveErr(error); setUserSaving(false); return; }
        // Reload profiles to get the new user
        const fresh = await getProfiles();
        setProfiles(fresh);
      }
      setShowUserModal(false);
    } catch (e: any) {
      setUserSaveErr(e.message ?? 'Save failed');
    } finally {
      setUserSaving(false);
    }
  };

  const toggleUserStatus = async (profile: ProfileRow) => {
    const next: UserStatus = profile.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await setUserStatus(profile.id, next);
      setProfiles(p => p.map(u => u.id === profile.id ? { ...u, status: next } : u));
    } catch (e: any) {
      alert('Failed to update status: ' + e.message);
    }
  };

  const handleDeleteUser = async (profile: ProfileRow) => {
    if (profile.id === currentUser.id) {
      alert('You cannot delete your own account.');
      return;
    }
    if (!confirm(`Delete user "${profile.name}" (${profile.email})? This cannot be undone.`)) return;
    const { error } = await deleteFleetUser(profile.id);
    if (error) { alert('Delete failed: ' + error); return; }
    setProfiles(p => p.filter(u => u.id !== profile.id));
  };

  // ── Site helpers ─────────────────────────────────────────────────────────
  const filteredSites = sites.filter(s =>
    s.name.toLowerCase().includes(searchSite.toLowerCase()) ||
    s.location.toLowerCase().includes(searchSite.toLowerCase())
  );

  const openSiteModal = (site?: SiteRow) => {
    setSiteSaveErr(null);
    setEditingSite(site ?? null);
    setSiteForm(site
      ? { name: site.name, location: site.location, contact: site.contact ?? '' }
      : { name: '', location: '', contact: '' }
    );
    setShowSiteModal(true);
  };

  const saveSite = async () => {
    if (!siteForm.name || !siteForm.location) return;
    setSiteSaving(true);
    setSiteSaveErr(null);
    try {
      if (editingSite) {
        const updated = await updateSite(editingSite.id, {
          name: siteForm.name,
          location: siteForm.location,
          contact: siteForm.contact || null,
        });
        setSites(p => p.map(s => s.id === editingSite.id ? updated : s));
      } else {
        const created = await createSite({
          name: siteForm.name,
          location: siteForm.location,
          contact: siteForm.contact || null,
          status: 'Active',
        });
        setSites(p => [...p, created]);
      }
      setShowSiteModal(false);
    } catch (e: any) {
      setSiteSaveErr(e.message ?? 'Save failed');
    } finally {
      setSiteSaving(false);
    }
  };

  const handleDeleteSite = async (id: string) => {
    if (!confirm('Delete this site? Vehicles assigned to it will be unlinked.')) return;
    try {
      await deleteSite(id);
      setSites(p => p.filter(s => s.id !== id));
    } catch (e: any) {
      alert('Delete failed: ' + e.message);
    }
  };

  // ── Role badge ────────────────────────────────────────────────────────────
  const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
    const cfg: Record<string, string> = {
      'Admin':           'bg-purple-100 text-purple-800',
      'Fleet Coordinator': 'bg-blue-100 text-blue-800',
      'Driver':          'bg-gray-100 text-gray-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg[role] ?? 'bg-gray-100 text-gray-700'}`}>{role}</span>;
  };

  // ── Toggle switch ─────────────────────────────────────────────────────────
  const Toggle: React.FC<{ on: boolean; onChange: () => void }> = ({ on, onChange }) => (
    <button onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? 'bg-blue-600' : 'bg-gray-300'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Administration</h1>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === i ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Users Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{profiles.length} registered users</p>
            <button onClick={() => openUserModal()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm">
              <Plus className="h-4 w-4 mr-1.5" />Add User
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search users…" value={searchUser}
              onChange={e => setSearchUser(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-500">Loading users…</span>
            </div>
          ) : usersError ? (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="h-4 w-4" />{usersError}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{user.email}</td>
                      <td className="px-6 py-4"><RoleBadge role={user.role} /></td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>{user.status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button onClick={() => openUserModal(user)} className="text-blue-600 hover:text-blue-800" title="Edit role / name">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => toggleUserStatus(user)}
                            title={user.status === 'Active' ? 'Deactivate' : 'Activate'}
                            className={user.status === 'Active' ? 'text-gray-400 hover:text-gray-600' : 'text-green-500 hover:text-green-700'}>
                            {user.status === 'Active' ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                          </button>
                          {user.id !== currentUser.id && (
                            <button onClick={() => handleDeleteUser(user)} className="text-red-500 hover:text-red-700" title="Delete user">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Sites Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 1 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{sites.length} sites configured</p>
            <button onClick={() => openSiteModal()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm">
              <Plus className="h-4 w-4 mr-1.5" />Add Site
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search sites…" value={searchSite}
              onChange={e => setSearchSite(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>

          {sitesLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-500">Loading sites…</span>
            </div>
          ) : sitesError ? (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="h-4 w-4" />{sitesError}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSites.map(site => (
                <div key={site.id} className="bg-white rounded-lg shadow p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{site.name}</h3>
                      <p className="text-sm text-gray-500 flex items-center mt-0.5">
                        <MapPin className="h-3 w-3 mr-1" />{site.location}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      site.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>{site.status}</span>
                  </div>
                  {site.contact && <p className="text-xs text-gray-500 mb-3">Contact: {site.contact}</p>}
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => openSiteModal(site)} className="text-blue-600 hover:text-blue-800 text-sm flex items-center">
                      <Edit2 className="h-3.5 w-3.5 mr-1" />Edit
                    </button>
                    <button onClick={() => handleDeleteSite(site.id)} className="text-red-500 hover:text-red-700 text-sm flex items-center">
                      <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                    </button>
                  </div>
                </div>
              ))}
              {filteredSites.length === 0 && (
                <p className="col-span-3 text-center text-gray-400 text-sm py-8">No sites found.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Settings Tab ──────────────────────────────────────────────────── */}
      {activeTab === 2 && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Company Settings</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input type="text" value={settings.companyName}
                onChange={e => setSettings(p => ({ ...p, companyName: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Inspection Frequency</label>
              <select value={settings.defaultFrequency}
                onChange={e => setSettings(p => ({ ...p, defaultFrequency: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Notification Preferences</h3>
            <div className="space-y-4">
              {([
                { key: 'notifyOverdue',       label: 'Overdue inspection alerts',    desc: 'Alert when inspection is past due date' },
                { key: 'notifyLicenseExpiry', label: 'License expiry reminders',     desc: '30, 14 and 7 days before expiry' },
                { key: 'notifyCostThreshold', label: 'Monthly cost threshold alerts', desc: 'Alert when costs exceed set limit' },
              ] as { key: keyof typeof settings; label: string; desc: string }[]).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                  <Toggle on={!!settings[key]} onChange={() => setSettings(p => ({ ...p, [key]: !p[key] }))} />
                </div>
              ))}
              {settings.notifyCostThreshold && (
                <div className="pl-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Threshold (R)</label>
                  <input type="number" value={settings.costThreshold}
                    onChange={e => setSettings(p => ({ ...p, costThreshold: e.target.value }))}
                    className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </div>
          </div>
          <button className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm">Save Settings</button>
        </div>
      )}

      {/* ── Audit Log Tab ─────────────────────────────────────────────────── */}
      {activeTab === 3 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">System Audit Log</h3>
            <p className="text-xs text-gray-500 mt-0.5">Read-only record of all system actions</p>
          </div>
          {auditLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-500">Loading audit log…</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {auditLog.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">
                        {new Date(entry.created_at).toLocaleString('en-ZA')}
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-gray-800">{entry.user_name}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[entry.action] ?? 'bg-gray-100 text-gray-600'}`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{entry.module}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{entry.details}</td>
                    </tr>
                  ))}
                  {auditLog.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">No audit entries yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── User Modal ────────────────────────────────────────────────────── */}
      {showUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{editingProfile ? 'Edit User' : 'Add User'}</h3>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" value={userForm.name}
                  onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., John Smith" />
              </div>
              {!editingProfile && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                    <input type="email" value={userForm.email}
                      onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="john@enprotec.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <input type="password" value={userForm.password}
                      onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="Min. 6 characters" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select value={userForm.role}
                  onChange={e => setUserForm(p => ({ ...p, role: e.target.value as UserRole }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {userSaveErr && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />{userSaveErr}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowUserModal(false)}
                  className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={saveUser} disabled={userSaving}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 font-medium disabled:opacity-60 flex items-center justify-center gap-2">
                  {userSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingProfile ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Site Modal ────────────────────────────────────────────────────── */}
      {showSiteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{editingSite ? 'Edit Site' : 'Add Site'}</h3>
              <button onClick={() => setShowSiteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Name *</label>
                <input type="text" value={siteForm.name}
                  onChange={e => setSiteForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Grootegeluk Mine" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                <input type="text" value={siteForm.location}
                  onChange={e => setSiteForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="City, Province" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <input type="text" value={siteForm.contact}
                  onChange={e => setSiteForm(p => ({ ...p, contact: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Full name" />
              </div>
              {siteSaveErr && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />{siteSaveErr}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowSiteModal(false)}
                  className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={saveSite} disabled={siteSaving}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 font-medium disabled:opacity-60 flex items-center justify-center gap-2">
                  {siteSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingSite ? 'Save Changes' : 'Add Site'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Administration;
