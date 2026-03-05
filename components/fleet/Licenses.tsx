import * as React from 'react';
import {
  FileText, Plus, Edit, Trash2, X, Search,
  AlertCircle, CheckCircle, Clock, Upload, Loader2,
} from 'lucide-react';
import {
  getLicenses, createLicense, updateLicense, deleteLicense,
  uploadLicenseDoc, computeLicenseStatus,
} from '../../supabase/services/licenses.service';
import { getVehicles } from '../../supabase/services/vehicles.service';
import type { LicenseRow, LicenseCat } from '../../supabase/database.types';
import type { VehicleRow } from '../../supabase/database.types';

type LicenseInsert = Omit<LicenseRow, 'id' | 'created_at' | 'updated_at'>;
type LicenseStatus = 'active' | 'expiring' | 'expired';

const VEHICLE_TYPES = ['Roadworthy', 'COF', 'Operating Permit', 'Vehicle Disc', 'Other'];
const DRIVER_TYPES  = ["Driver's Licence", 'PDP', 'Other'];

const daysLeft = (exp: string) =>
  Math.ceil((new Date(exp).getTime() - Date.now()) / 86_400_000);

const StatusBadge: React.FC<{ expiry: string }> = ({ expiry }) => {
  const status = computeLicenseStatus(expiry);
  const cfg: Record<LicenseStatus, { cls: string; Icon: React.FC<{ className?: string }>; label: string }> = {
    active:   { cls: 'bg-green-100 text-green-800', Icon: CheckCircle, label: 'Active' },
    expiring: { cls: 'bg-amber-100 text-amber-800', Icon: Clock,       label: 'Expiring Soon' },
    expired:  { cls: 'bg-red-100 text-red-800',     Icon: AlertCircle, label: 'Expired' },
  };
  const { cls, Icon, label } = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <Icon className="h-3 w-3" />{label}
    </span>
  );
};

const EMPTY_V_FORM = {
  vehicle_id: '',
  vehicle_registration_display: '',   // local only for display
  license_type: 'Roadworthy',
  license_number: '',
  issue_date: '',
  expiry_date: '',
  notes: '',
};

const EMPTY_D_FORM = {
  driver_name: '',
  driver_employee_id: '',
  license_type: "Driver's Licence",
  license_number: '',
  issue_date: '',
  expiry_date: '',
  notes: '',
};

const Licenses: React.FC = () => {
  const [licenses, setLicenses]     = React.useState<LicenseRow[]>([]);
  const [vehicles, setVehicles]     = React.useState<VehicleRow[]>([]);
  const [loading, setLoading]       = React.useState(true);
  const [error, setError]           = React.useState<string | null>(null);
  const [activeTab, setActiveTab]   = React.useState<'Vehicle' | 'Driver'>('Vehicle');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | LicenseStatus>('all');
  const [showModal, setShowModal]   = React.useState(false);
  const [editId, setEditId]         = React.useState<string | null>(null);
  const [vForm, setVForm]           = React.useState({ ...EMPTY_V_FORM });
  const [dForm, setDForm]           = React.useState({ ...EMPTY_D_FORM });
  const [docFile, setDocFile]       = React.useState<File | null>(null);
  const [saving, setSaving]         = React.useState(false);
  const [saveError, setSaveError]   = React.useState<string | null>(null);

  React.useEffect(() => {
    Promise.all([getLicenses(), getVehicles()])
      .then(([l, v]) => { setLicenses(l); setVehicles(v); })
      .catch(e => setError(e.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const vehicleRegById = React.useMemo(() => {
    const m: Record<string, string> = {};
    vehicles.forEach(v => { m[v.id] = v.registration; });
    return m;
  }, [vehicles]);

  const current = licenses.filter(l => l.category === activeTab);

  const filtered = current.filter(l => {
    const name = l.category === 'Vehicle'
      ? (vehicleRegById[l.vehicle_id ?? ''] ?? '')
      : (l.driver_name ?? '');
    const matchSearch = !searchTerm ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.license_number.toLowerCase().includes(searchTerm.toLowerCase());
    const status = computeLicenseStatus(l.expiry_date);
    const matchStatus = statusFilter === 'all' || status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    active:   current.filter(l => computeLicenseStatus(l.expiry_date) === 'active').length,
    expiring: current.filter(l => computeLicenseStatus(l.expiry_date) === 'expiring').length,
    expired:  current.filter(l => computeLicenseStatus(l.expiry_date) === 'expired').length,
  };
  const alertCount = counts.expiring + counts.expired;

  const openAdd = () => {
    setSaveError(null);
    setEditId(null);
    setVForm({ ...EMPTY_V_FORM });
    setDForm({ ...EMPTY_D_FORM });
    setDocFile(null);
    setShowModal(true);
  };

  const openEdit = (l: LicenseRow) => {
    setSaveError(null);
    setEditId(l.id);
    setDocFile(null);
    if (l.category === 'Vehicle') {
      setVForm({
        vehicle_id: l.vehicle_id ?? '',
        vehicle_registration_display: vehicleRegById[l.vehicle_id ?? ''] ?? '',
        license_type: l.license_type,
        license_number: l.license_number,
        issue_date: l.issue_date,
        expiry_date: l.expiry_date,
        notes: l.notes ?? '',
      });
    } else {
      setDForm({
        driver_name: l.driver_name ?? '',
        driver_employee_id: l.driver_employee_id ?? '',
        license_type: l.license_type,
        license_number: l.license_number,
        issue_date: l.issue_date,
        expiry_date: l.expiry_date,
        notes: l.notes ?? '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const isVehicle = activeTab === 'Vehicle';
      const payload: LicenseInsert = isVehicle
        ? {
            category: 'Vehicle',
            vehicle_id: vForm.vehicle_id || null,
            driver_name: null,
            driver_employee_id: null,
            license_type: vForm.license_type,
            license_number: vForm.license_number,
            issue_date: vForm.issue_date,
            expiry_date: vForm.expiry_date,
            notes: vForm.notes || null,
            document_url: null,
            created_by: null,
          }
        : {
            category: 'Driver',
            vehicle_id: null,
            driver_name: dForm.driver_name || null,
            driver_employee_id: dForm.driver_employee_id || null,
            license_type: dForm.license_type,
            license_number: dForm.license_number,
            issue_date: dForm.issue_date,
            expiry_date: dForm.expiry_date,
            notes: dForm.notes || null,
            document_url: null,
            created_by: null,
          };

      let saved: LicenseRow;
      if (editId) {
        saved = await updateLicense(editId, payload);
        setLicenses(p => p.map(l => l.id === editId ? saved : l));
      } else {
        saved = await createLicense(payload);
        setLicenses(p => [...p, saved]);
      }

      // Upload document if provided
      if (docFile) {
        try {
          const url = await uploadLicenseDoc(docFile, saved.id);
          const withDoc = await updateLicense(saved.id, { document_url: url });
          setLicenses(p => p.map(l => l.id === saved.id ? withDoc : l));
        } catch {
          // Document upload failure is non-critical
        }
      }
      setShowModal(false);
    } catch (e: any) {
      setSaveError(e.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this license?')) return;
    try {
      await deleteLicense(id);
      setLicenses(p => p.filter(l => l.id !== id));
    } catch (e: any) {
      alert('Delete failed: ' + e.message);
    }
  };

  const exportCSV = () => {
    const rows = filtered.map(l => {
      const name = l.category === 'Vehicle'
        ? vehicleRegById[l.vehicle_id ?? ''] ?? ''
        : l.driver_name ?? '';
      return [name, l.license_type, l.license_number, l.issue_date, l.expiry_date, computeLicenseStatus(l.expiry_date)].join(',');
    });
    const header = activeTab === 'Vehicle'
      ? 'Vehicle,Type,License #,Issue Date,Expiry Date,Status'
      : 'Driver,Type,License #,Issue Date,Expiry Date,Status';
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `licenses-${activeTab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading licenses…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <AlertCircle className="h-5 w-5 flex-shrink-0" /><span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-zinc-900">Licenses</h1>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="inline-flex items-center gap-2 border border-zinc-300 text-zinc-700 px-4 py-2 rounded-lg hover:bg-zinc-50 text-sm font-medium">
            Export CSV
          </button>
          <button onClick={openAdd}
            className="inline-flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 text-sm font-medium">
            <Plus className="h-4 w-4" /> Add License
          </button>
        </div>
      </div>

      {/* Alert banner */}
      {alertCount > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 text-sm">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <strong>{alertCount} license{alertCount > 1 ? 's' : ''} require attention</strong> in the current view —{' '}
            {counts.expired > 0 && `${counts.expired} expired`}
            {counts.expired > 0 && counts.expiring > 0 && ', '}
            {counts.expiring > 0 && `${counts.expiring} expiring within 30 days`}.
            {' '}Renew promptly to remain compliant.
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-zinc-200">
        <nav className="flex -mb-px space-x-8">
          {(['Vehicle', 'Driver'] as const).map(tab => (
            <button key={tab}
              onClick={() => { setActiveTab(tab); setSearchTerm(''); setStatusFilter('all'); }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
              }`}>
              {tab === 'Vehicle' ? 'Vehicle Licenses' : 'Driver Licenses'}
            </button>
          ))}
        </nav>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {([
          { key: 'active',   label: 'Active',       Icon: CheckCircle, color: 'green' },
          { key: 'expiring', label: 'Expiring Soon', Icon: Clock,       color: 'amber' },
          { key: 'expired',  label: 'Expired',       Icon: AlertCircle, color: 'red'   },
        ] as const).map(({ key, label, Icon, color }) => (
          <button key={key}
            onClick={() => setStatusFilter(p => p === key ? 'all' : key)}
            className={`bg-white rounded-lg shadow p-5 flex items-center gap-4 text-left ring-2 transition-all ${
              statusFilter === key ? `ring-${color}-400` : 'ring-transparent hover:ring-zinc-200'
            }`}>
            <div className={`bg-${color}-100 p-3 rounded-full flex-shrink-0`}>
              <Icon className={`h-6 w-6 text-${color}-600`} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-600">{label}</p>
              <p className="text-2xl font-bold text-zinc-900">{counts[key]}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4 flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input type="text"
            placeholder={activeTab === 'Vehicle' ? 'Search vehicle or license #…' : 'Search driver or license #…'}
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
        </div>
        {(searchTerm || statusFilter !== 'all') && (
          <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
            className="text-xs text-zinc-500 hover:text-zinc-800 underline whitespace-nowrap">
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-zinc-400 mb-3" />
            <p className="text-zinc-500">
              {searchTerm || statusFilter !== 'all' ? 'No licenses match your filter.' : 'No licenses yet.'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button onClick={openAdd}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm">
                <Plus className="h-4 w-4" /> Add License
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  {[
                    activeTab === 'Vehicle' ? 'Vehicle' : 'Driver',
                    'Type', 'License #', 'Issued', 'Expires', 'Status', 'Days Left', 'Actions',
                  ].map((h, i) => (
                    <th key={h} className={`px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider ${i === 7 ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-zinc-100">
                {filtered.map(l => {
                  const days = daysLeft(l.expiry_date);
                  const name = l.category === 'Vehicle'
                    ? (vehicleRegById[l.vehicle_id ?? ''] ?? '—')
                    : (l.driver_name ?? '—');
                  return (
                    <tr key={l.id} className="hover:bg-zinc-50">
                      <td className="px-5 py-3 font-medium text-zinc-900">{name}</td>
                      <td className="px-5 py-3 text-zinc-600">{l.license_type}</td>
                      <td className="px-5 py-3 text-zinc-600 font-mono">{l.license_number}</td>
                      <td className="px-5 py-3 text-zinc-600">{l.issue_date}</td>
                      <td className="px-5 py-3 text-zinc-600">{l.expiry_date}</td>
                      <td className="px-5 py-3"><StatusBadge expiry={l.expiry_date} /></td>
                      <td className={`px-5 py-3 font-medium ${days <= 0 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-zinc-600'}`}>
                        {days <= 0 ? 'Expired' : `${days}d`}
                      </td>
                      <td className="px-5 py-3 text-right space-x-3">
                        {l.document_url && (
                          <a href={l.document_url} target="_blank" rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-zinc-600 inline-block" title="View document">
                            <FileText className="h-4 w-4" />
                          </a>
                        )}
                        <button onClick={() => openEdit(l)} className="text-sky-600 hover:text-sky-800" title="Edit">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(l.id)} className="text-red-500 hover:text-red-700" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold text-zinc-900">
                {editId ? 'Edit License' : `Add ${activeTab} License`}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {activeTab === 'Vehicle' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Vehicle *</label>
                      <select required value={vForm.vehicle_registration_display}
                        onChange={e => {
                          const reg = e.target.value;
                          const v = vehicles.find(v => v.registration === reg);
                          setVForm(f => ({ ...f, vehicle_id: v?.id ?? '', vehicle_registration_display: reg }));
                        }}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-sm">
                        <option value="" disabled>Select vehicle…</option>
                        {vehicles.map(v => <option key={v.id} value={v.registration}>{v.registration}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">License Type *</label>
                      <select required value={vForm.license_type}
                        onChange={e => setVForm(f => ({ ...f, license_type: e.target.value }))}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-sm">
                        {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Driver Name *</label>
                      <input required type="text" placeholder="e.g., John Doe"
                        value={dForm.driver_name}
                        onChange={e => setDForm(f => ({ ...f, driver_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Employee ID</label>
                      <input type="text" placeholder="e.g., EMP-001"
                        value={dForm.driver_employee_id}
                        onChange={e => setDForm(f => ({ ...f, driver_employee_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">License Type *</label>
                      <select required value={dForm.license_type}
                        onChange={e => setDForm(f => ({ ...f, license_type: e.target.value }))}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-sm">
                        {DRIVER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">License Number *</label>
                  <input required type="text" placeholder="e.g., RW-2024-001"
                    value={activeTab === 'Vehicle' ? vForm.license_number : dForm.license_number}
                    onChange={e => activeTab === 'Vehicle'
                      ? setVForm(f => ({ ...f, license_number: e.target.value }))
                      : setDForm(f => ({ ...f, license_number: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Issue Date *</label>
                    <input required type="date"
                      value={activeTab === 'Vehicle' ? vForm.issue_date : dForm.issue_date}
                      onChange={e => activeTab === 'Vehicle'
                        ? setVForm(f => ({ ...f, issue_date: e.target.value }))
                        : setDForm(f => ({ ...f, issue_date: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Expiry Date *</label>
                    <input required type="date"
                      value={activeTab === 'Vehicle' ? vForm.expiry_date : dForm.expiry_date}
                      onChange={e => activeTab === 'Vehicle'
                        ? setVForm(f => ({ ...f, expiry_date: e.target.value }))
                        : setDForm(f => ({ ...f, expiry_date: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Notes</label>
                  <textarea rows={2} placeholder="Optional notes…"
                    value={activeTab === 'Vehicle' ? vForm.notes : dForm.notes}
                    onChange={e => activeTab === 'Vehicle'
                      ? setVForm(f => ({ ...f, notes: e.target.value }))
                      : setDForm(f => ({ ...f, notes: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-sm resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Document (optional)</label>
                  <label className="flex items-center gap-2 border-2 border-dashed border-zinc-300 rounded-lg p-3 cursor-pointer hover:border-sky-400 text-zinc-500 text-sm">
                    <Upload className="h-4 w-4 flex-shrink-0" />
                    <span>{docFile ? docFile.name : 'Click to upload PDF / JPG / PNG'}</span>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only"
                      onChange={e => setDocFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>

                {saveError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />{saveError}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t flex justify-end gap-3 flex-shrink-0">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-700 hover:bg-zinc-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-700 disabled:opacity-60 flex items-center gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editId ? 'Update License' : 'Save License'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Licenses;
