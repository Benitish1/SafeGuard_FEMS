// Maintenance page (admin/inspector) — list maintenance logs and add a new one
// (extinguisher, action taken, date, issues, recommendations, notes).
import { useEffect, useState, useCallback } from 'react';
import { Plus, Wrench, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { fmtDate } from '../lib/ui';
import Modal from '../components/Modal';

export default function Maintenance() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [extinguishers, setExtinguishers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, e] = await Promise.all([api.get('/maintenance'), api.get('/extinguishers')]);
      setLogs(m.logs); setExtinguishers(e.extinguishers);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Maintenance Logs</h1>
          <p className="text-slate-500">Record of all maintenance activities and findings.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Log maintenance</button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-ember-500" size={28} /></div>
      ) : logs.length === 0 ? (
        <div className="card grid place-items-center py-16 text-slate-400"><Wrench size={44} className="mb-3 opacity-30" /> No maintenance logged yet.</div>
      ) : (
        <div className="space-y-3">
          {logs.map((m) => (
            <div key={m.id} className="card flex flex-wrap items-start gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-ember-500/15 text-ember-500"><Wrench size={18} /></div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display font-semibold">{m.actionTaken}</p>
                  <span className="badge bg-slate-500/15 text-slate-400">{m.serialNumber}</span>
                </div>
                {m.issuesIdentified && <p className="mt-1 text-sm text-flame-500">Issues: {m.issuesIdentified}</p>}
                {m.recommendations && <p className="mt-1 text-sm text-slate-500">Recommendation: {m.recommendations}</p>}
                {m.notes && <p className="mt-1 text-sm text-slate-400">{m.notes}</p>}
              </div>
              <span className="text-xs text-slate-400">{fmtDate(m.maintenanceDate)}</span>
            </div>
          ))}
        </div>
      )}

      <LogModal open={open} onClose={() => setOpen(false)} extinguishers={extinguishers}
        onDone={() => { setOpen(false); toast.success('Maintenance logged.'); load(); }} />
    </div>
  );
}

function LogModal({ open, onClose, extinguishers, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({ extinguisherId: '', actionTaken: '', maintenanceDate: '', issuesIdentified: '', recommendations: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await api.post('/maintenance', form); onDone(); setForm({ extinguisherId: '', actionTaken: '', maintenanceDate: '', issuesIdentified: '', recommendations: '', notes: '' }); }
    catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Log maintenance activity">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">Fire extinguisher</label>
          <select className="input" required value={form.extinguisherId} onChange={set('extinguisherId')}>
            <option value="">Select…</option>
            {extinguishers.map((e) => <option key={e.id} value={e.id}>{e.serialNumber} — {e.location}</option>)}
          </select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Action taken</label><input className="input" required value={form.actionTaken} onChange={set('actionTaken')} /></div>
          <div><label className="label">Date</label><input className="input" type="date" required value={form.maintenanceDate} onChange={set('maintenanceDate')} /></div>
        </div>
        <div><label className="label">Issues identified</label><input className="input" value={form.issuesIdentified} onChange={set('issuesIdentified')} /></div>
        <div><label className="label">Recommendations</label><input className="input" value={form.recommendations} onChange={set('recommendations')} /></div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={set('notes')} /></div>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : null} Save log</button>
        </div>
      </form>
    </Modal>
  );
}
