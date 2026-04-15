import * as React from 'react';
import {
  AlertCircle, CheckCircle2, Clock, Search, Filter, X,
  Upload, FileText, Camera, ExternalLink, Loader2,
} from 'lucide-react';
import {
  getOpenActions, resolveAction, uploadProof, getOpenCount,
} from '../../supabase/services/openActions.service';
import { logAction } from '../../supabase/services/audit.service';
import type { OpenActionRow } from '../../supabase/database.types';
import type { User } from '../../types';

type StatusFilter = 'open' | 'resolved' | 'all';

const OpenActions: React.FC<{ user: User | null }> = ({ user }) => {
  const [actions, setActions]           = React.useState<OpenActionRow[]>([]);
  const [loading, setLoading]           = React.useState(true);
  const [error, setError]               = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm]     = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('open');
  const [resolveModal, setResolveModal] = React.useState<OpenActionRow | null>(null);

  // Stats
  const openCount    = actions.filter(a => a.status === 'open').length;
  const resolvedCount = actions.filter(a => {
    if (a.status !== 'resolved' || !a.resolved_at) return false;
    const resolved = new Date(a.resolved_at);
    const weekAgo  = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return resolved >= weekAgo;
  }).length;
  const overdueCount = actions.filter(a => {
    if (a.status !== 'open') return false;
    const created = new Date(a.created_at);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return created < weekAgo;
  }).length;

  // Load data
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getOpenActions();
        if (!cancelled) setActions(data);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Filtered list
  const filtered = actions.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const reg = a.vehicle?.registration?.toLowerCase() ?? '';
      const make = a.vehicle?.make?.toLowerCase() ?? '';
      const model = a.vehicle?.model?.toLowerCase() ?? '';
      const item = a.item.toLowerCase();
      const dev = a.deviation.toLowerCase();
      if (![reg, make, model, item, dev].some(s => s.includes(q))) return false;
    }
    return true;
  });

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
      <span className="ml-2 text-sm text-zinc-500">Loading open actions…</span>
    </div>
  );
  if (error) return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
      <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
      <p className="text-sm text-red-700">{error}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Open Actions</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Track and resolve inspection deviations. Actions remain open until proof of resolution is provided.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-800">{openCount}</p>
              <p className="text-xs text-zinc-500">Open Actions</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-800">{resolvedCount}</p>
              <p className="text-xs text-zinc-500">Resolved This Week</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <Clock className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-800">{overdueCount}</p>
              <p className="text-xs text-zinc-500">Overdue (&gt;7 days)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by vehicle, item, or deviation…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none"
            />
          </div>
          <div className="flex gap-2">
            {(['open', 'resolved', 'all'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  statusFilter === s
                    ? 'bg-sky-100 text-sky-700 border border-sky-300'
                    : 'bg-zinc-50 text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-zinc-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">
              {statusFilter === 'open' ? 'No open actions — all clear!' : 'No actions match your filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Vehicle</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Item</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Deviation</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Inspection Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const isOverdue = a.status === 'open' && new Date(a.created_at) < new Date(Date.now() - 7 * 86400000);
                  return (
                    <tr key={a.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-800">{a.vehicle?.registration ?? '—'}</p>
                        <p className="text-xs text-zinc-400">
                          {a.vehicle ? `${a.vehicle.make} ${a.vehicle.model}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">{a.item}</td>
                      <td className="px-4 py-3 text-zinc-700">{a.deviation}</td>
                      <td className="px-4 py-3 text-zinc-500">
                        {a.inspection?.started_at
                          ? new Date(a.inspection.started_at).toLocaleDateString()
                          : new Date(a.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {a.status === 'resolved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3" /> Resolved
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <Clock className="w-3 h-3" /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            <AlertCircle className="w-3 h-3" /> Open
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {a.status === 'open' ? (
                          <button
                            onClick={() => setResolveModal(a)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition"
                          >
                            Resolve
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            {a.proof_url && (
                              <a
                                href={a.proof_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" /> Proof
                              </a>
                            )}
                            {a.resolution_notes && (
                              <span className="text-xs text-zinc-400 truncate max-w-[120px]" title={a.resolution_notes}>
                                {a.resolution_notes}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {resolveModal && (
        <ResolveModal
          action={resolveModal}
          user={user}
          onClose={() => setResolveModal(null)}
          onResolved={(updated) => {
            setActions(prev => prev.map(a => a.id === updated.id ? updated : a));
            setResolveModal(null);
          }}
        />
      )}
    </div>
  );
};

/* ─── Resolve Modal ──────────────────────────────────────────── */

const ResolveModal: React.FC<{
  action: OpenActionRow;
  user: User | null;
  onClose: () => void;
  onResolved: (updated: OpenActionRow) => void;
}> = ({ action, user, onClose, onResolved }) => {
  const [file, setFile]       = React.useState<File | null>(null);
  const [notes, setNotes]     = React.useState('');
  const [saving, setSaving]   = React.useState(false);
  const [err, setErr]         = React.useState<string | null>(null);

  const proofType = React.useMemo(() => {
    if (!file) return '';
    if (file.type === 'application/pdf') return 'invoice';
    if (file.type.startsWith('image/')) return 'photo';
    return 'service_report';
  }, [file]);

  const handleSubmit = async () => {
    if (!file) { setErr('Please upload proof (photo or PDF).'); return; }
    if (!user) return;
    setSaving(true);
    setErr(null);
    try {
      const proofUrl = await uploadProof(file, action.id);
      const updated = await resolveAction(action.id, {
        proof_url: proofUrl,
        proof_type: proofType,
        resolution_notes: notes,
        resolved_by: user.id,
      });
      await logAction(
        user.id,
        user.name,
        'Resolved',
        'OpenActions',
        `Resolved deviation "${action.item}: ${action.deviation}" for vehicle ${action.vehicle?.registration ?? action.vehicle_id}`,
      );
      onResolved(updated);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-zinc-800">Resolve Action</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-zinc-100">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Action info */}
        <div className="bg-zinc-50 rounded-lg p-4 mb-4 space-y-1">
          <p className="text-sm">
            <span className="font-medium text-zinc-600">Vehicle:</span>{' '}
            {action.vehicle?.registration ?? '—'}{' '}
            <span className="text-zinc-400">
              {action.vehicle ? `${action.vehicle.make} ${action.vehicle.model}` : ''}
            </span>
          </p>
          <p className="text-sm">
            <span className="font-medium text-zinc-600">Item:</span> {action.item}
          </p>
          <p className="text-sm">
            <span className="font-medium text-zinc-600">Deviation:</span> {action.deviation}
          </p>
        </div>

        {/* Upload proof */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Upload Proof <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-zinc-400 mb-2">Photo of repair or PDF invoice / service report</p>
          <label className="flex items-center justify-center gap-2 w-full py-8 border-2 border-dashed border-zinc-300 rounded-lg cursor-pointer hover:border-sky-400 hover:bg-sky-50/50 transition">
            {file ? (
              <div className="text-center">
                {file.type.startsWith('image/') ? (
                  <Camera className="w-6 h-6 text-sky-500 mx-auto mb-1" />
                ) : (
                  <FileText className="w-6 h-6 text-sky-500 mx-auto mb-1" />
                )}
                <p className="text-sm text-zinc-700 font-medium">{file.name}</p>
                <p className="text-xs text-zinc-400">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <>
                <Upload className="w-5 h-5 text-zinc-400" />
                <span className="text-sm text-zinc-500">Click to upload photo or PDF</span>
              </>
            )}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
            />
          </label>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 mb-1">Resolution Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Windscreen replaced at XYZ workshop, invoice attached…"
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none resize-none"
          />
        </div>

        {err && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !file}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Resolving…' : 'Resolve Action'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpenActions;
