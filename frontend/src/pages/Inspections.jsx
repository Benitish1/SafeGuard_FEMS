// Inspections page — filter by status; admin/inspector can Complete (record a
// result) or Cancel (sets status to "Cancelled", with a confirmation) inspections
// that are still Pending/Overdue.
import { useEffect, useState, useCallback } from 'react';
import { CalendarCheck, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { statusTone, fmtDate } from '../lib/ui';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

const FILTERS = ['', 'Pending', 'Completed', 'Overdue', 'Cancelled'];

export default function Inspections() {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = ['admin', 'inspector'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [complete, setComplete] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/inspections${filter ? `?status=${filter}` : ''}`);
      setItems(data.inspections);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);

  // "Cancel" sets the inspection's status to Cancelled (it then appears under the
  // Cancelled filter) rather than hard-deleting the record.
  const doCancel = async () => {
    await api.put(`/inspections/${cancelTarget.id}`, { status: 'Cancelled' });
    toast.success('Inspection cancelled.');
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Inspections</h1>
          <p className="text-slate-500">Scheduled and completed extinguisher inspections.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f || 'all'} onClick={() => setFilter(f)}
              className={`btn px-3 py-2 text-xs ${filter === f ? 'btn-primary' : 'btn-ghost'}`}>
              {f || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-ember-500" size={28} /></div>
        ) : items.length === 0 ? (
          <div className="grid place-items-center py-16 text-slate-400">
            <CalendarCheck size={44} className="mb-3 opacity-30" /> No inspections found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-white/10">
                <tr>
                  <th className="p-4">Extinguisher</th><th className="p-4">Location</th>
                  <th className="p-4">Scheduled</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                    <td className="p-4 font-semibold">{i.serialNumber}</td>
                    <td className="p-4 text-slate-500">{i.location}</td>
                    <td className="p-4 text-slate-500">{fmtDate(i.scheduledDate)} · {i.scheduledTime?.slice(0, 5)}</td>
                    <td className="p-4"><span className={`badge ${statusTone[i.status]}`}>{i.status}</span></td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        {canManage && (i.status === 'Pending' || i.status === 'Overdue') && (
                          <button className="btn btn-ghost py-1.5 text-xs text-emerald-500" onClick={() => setComplete(i)}>
                            <CheckCircle2 size={14} /> Complete
                          </button>
                        )}
                        {canManage && (i.status === 'Pending' || i.status === 'Overdue') && (
                          <button className="btn btn-ghost py-1.5 text-xs text-flame-500" onClick={() => setCancelTarget(i)} title="Cancel inspection">
                            <Trash2 size={14} /> Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CompleteModal target={complete} onClose={() => setComplete(null)} onDone={() => { setComplete(null); toast.success('Inspection completed.'); load(); }} />

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel inspection"
        message={cancelTarget ? `Are you sure you want to cancel the inspection for ${cancelTarget.serialNumber} scheduled on ${fmtDate(cancelTarget.scheduledDate)}? It will be moved to "Cancelled".` : ''}
        confirmLabel="Yes, cancel it"
        onConfirm={doCancel}
      />
    </div>
  );
}

function CompleteModal({ target, onClose, onDone }) {
  const toast = useToast();
  const [result, setResult] = useState('Pass');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/inspections/${target.id}`, { status: 'Completed', result, notes });
      onDone();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={!!target} onClose={onClose} title={`Complete inspection · ${target?.serialNumber || ''}`}>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">Result</label>
          <select className="input" value={result} onChange={(e) => setResult(e.target.value)}>
            <option>Pass</option><option>Pass with notes</option><option>Fail</option>
          </select></div>
        <div><label className="label">Notes</label><textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : null} Mark complete</button>
        </div>
      </form>
    </Modal>
  );
}
