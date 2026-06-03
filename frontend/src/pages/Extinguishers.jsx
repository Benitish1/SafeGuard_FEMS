// Extinguishers page.
// - Admin: register / edit / delete (delete requires confirm + OTP) units, and may
//   assign an inspector when scheduling an inspection.
// - Inspector: update a unit's condition/status (what they found in the field) and
//   schedule inspections. Cannot register/edit/delete (units are company assets).
// - User: read-only view + can request an inspection.
import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, CalendarPlus, FireExtinguisher, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { statusTone, fmtDate } from '../lib/ui';
import Modal from '../components/Modal';
import ConfirmOtpDialog from '../components/ConfirmOtpDialog';

const TYPES = ['Water', 'CO2', 'Foam', 'Dry Chemical'];
const SIZES = ['1.5 lb', '5 lb', '9 lb', '12 lb'];
const STATUSES = ['Active', 'Inactive', 'Expired', 'Needs Maintenance', 'Decommissioned'];

const empty = { serialNumber: '', location: '', type: 'CO2', size: '5 lb', installationDate: '', expiryDate: '', status: 'Active' };

export default function Extinguishers() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';                       // can register/edit/delete
  const canInspect = ['admin', 'inspector'].includes(user?.role); // can update condition / schedule

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [inspectors, setInspectors] = useState([]); // for admin assignment

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const [delTarget, setDelTarget] = useState(null);
  const [schedTarget, setSchedTarget] = useState(null);

  // Fetch the list, passing the search term (q) and status filter as query params.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (statusFilter) params.set('status', statusFilter);
      const data = await api.get(`/extinguishers?${params.toString()}`);
      setItems(data.extinguishers);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [q, statusFilter, toast]);

  useEffect(() => { load(); }, [load]);

  // Admins load the inspector list so they can assign one when scheduling.
  useEffect(() => {
    if (isAdmin) {
      api.get('/auth/users')
        .then((d) => setInspectors(d.users.filter((u) => u.role === 'inspector')))
        .catch(() => {});
    }
  }, [isAdmin]);

  const openCreate = () => { setEditing(null); setForm(empty); setFormOpen(true); };
  const openEdit = (e) => {
    setEditing(e);
    setForm({
      serialNumber: e.serialNumber, location: e.location, type: e.type, size: e.size,
      installationDate: e.installationDate?.slice(0, 10), expiryDate: e.expiryDate?.slice(0, 10), status: e.status,
    });
    setFormOpen(true);
  };

  // Create/edit (admin only): PUT when editing, POST when new.
  const save = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/extinguishers/${editing.id}`, form);
        toast.success('Extinguisher updated.');
      } else {
        await api.post('/extinguishers', form);
        toast.success('Extinguisher registered.');
      }
      setFormOpen(false);
      load();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // Inspector/admin quick condition update — hits the status-only endpoint.
  const updateStatus = async (e, status) => {
    try {
      await api.put(`/extinguishers/${e.id}/status`, { status });
      toast.success(`${e.serialNumber} marked "${status}".`);
      load();
    } catch (err) { toast.error(err.message); }
  };

  // Delete (admin only): OTP entered in the dialog is verified server-side.
  const doDelete = async (otp) => {
    await api.del(`/extinguishers/${delTarget.id}`, { otp });
    toast.success('Extinguisher deleted.');
    setDelTarget(null);
    load();
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Fire Extinguishers</h1>
          <p className="text-slate-500">Company fire-safety assets and their current condition.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Register new</button>
        )}
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input className="input pl-10" placeholder="Search serial or location…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-ember-500" size={32} /></div>
      ) : items.length === 0 ? (
        <div className="card grid place-items-center py-16 text-center">
          <FireExtinguisher size={48} className="mb-3 text-slate-300 dark:text-white/10" />
          <p className="text-slate-400">No extinguishers found.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((e) => (
            <div key={e.id} className="card group transition hover:-translate-y-1 hover:shadow-glow">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-ember-500/15 text-ember-500">
                    <FireExtinguisher size={18} />
                  </div>
                  <div>
                    <p className="font-display font-bold">{e.serialNumber}</p>
                    <p className="text-xs text-slate-400">{e.type} · {e.size}</p>
                  </div>
                </div>
                <span className={`badge ${statusTone[e.status]}`}>{e.status}</span>
              </div>
              <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">Location: {e.location}</p>
              <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
                <span>Installed: {fmtDate(e.installationDate)}</span>
                <span>Expires: {fmtDate(e.expiryDate)}</span>
              </div>

              {/* Inspector/admin: update condition found in the field */}
              {canInspect && (
                <div className="mb-3">
                  <label className="label">Update condition</label>
                  <select className="input py-1.5 text-xs" value={e.status} onChange={(ev) => updateStatus(e, ev.target.value)}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div className="flex gap-2 border-t border-slate-200 pt-3 dark:border-white/10">
                <button className="btn btn-ghost flex-1 py-2 text-xs" onClick={() => setSchedTarget(e)}>
                  <CalendarPlus size={14} /> {canInspect ? 'Schedule inspection' : 'Request inspection'}
                </button>
                {isAdmin && (
                  <>
                    <button className="btn btn-ghost py-2" onClick={() => openEdit(e)} title="Edit"><Pencil size={14} /></button>
                    <button className="btn btn-ghost py-2 text-flame-500 hover:bg-flame-500/10" onClick={() => setDelTarget(e)} title="Delete"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit modal (admin only) */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit extinguisher' : 'Register extinguisher'}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="label">Serial number</label>
              <input className="input" required value={form.serialNumber} onChange={set('serialNumber')} /></div>
            <div className="col-span-2"><label className="label">Location</label>
              <input className="input" required value={form.location} onChange={set('location')} /></div>
            <div><label className="label">Type</label>
              <select className="input" value={form.type} onChange={set('type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label className="label">Size</label>
              <select className="input" value={form.size} onChange={set('size')}>{SIZES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label className="label">Installation date</label>
              <input className="input" type="date" required value={form.installationDate} onChange={set('installationDate')} /></div>
            <div><label className="label">Expiry date</label>
              <input className="input" type="date" required value={form.expiryDate} onChange={set('expiryDate')} /></div>
            <div className="col-span-2"><label className="label">Status</label>
              <select className="input" value={form.status} onChange={set('status')}>{STATUSES.map((t) => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {editing ? 'Save changes' : 'Register'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm + OTP (admin only) */}
      <ConfirmOtpDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        title="Delete extinguisher"
        message={delTarget ? `Are you sure you want to permanently delete ${delTarget.serialNumber} (${delTarget.location})? This cannot be undone.` : ''}
        confirmLabel="Yes, delete it"
        purpose="delete_extinguisher"
        reference={delTarget?.id}
        onConfirm={doDelete}
      />

      {/* Schedule / request inspection modal */}
      <ScheduleModal
        target={schedTarget}
        isAdmin={isAdmin}
        inspectors={inspectors}
        onClose={() => setSchedTarget(null)}
        onDone={() => { setSchedTarget(null); toast.success('Inspection scheduled.'); }}
      />
    </div>
  );
}

// Modal to schedule (or request) an inspection. Admins may also assign an inspector.
function ScheduleModal({ target, isAdmin, inspectors, onClose, onDone }) {
  const toast = useToast();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [inspectorId, setInspectorId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/inspections', {
        extinguisherId: target.id,
        scheduledDate: date,
        scheduledTime: time,
        inspectorId: inspectorId || null, // admin-assigned inspector (optional)
        notes,
      });
      onDone();
      setDate(''); setInspectorId(''); setNotes('');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={!!target} onClose={onClose} title={`Schedule inspection · ${target?.serialNumber || ''}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Date</label><input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label className="label">Time</label><input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        </div>
        {/* Only an admin assigns an inspector to the job */}
        {isAdmin && (
          <div>
            <label className="label">Assign inspector (optional)</label>
            <select className="input" value={inspectorId} onChange={(e) => setInspectorId(e.target.value)}>
              <option value="">Unassigned</option>
              {inspectors.map((i) => <option key={i.id} value={i.id}>{i.firstName} {i.lastName}</option>)}
            </select>
          </div>
        )}
        <div><label className="label">Notes (optional)</label><textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : null} Schedule</button>
        </div>
      </form>
    </Modal>
  );
}
