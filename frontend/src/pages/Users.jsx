// Users page (admin-only) — list all users, change their role (user/inspector/
// admin) and delete accounts.
import { useEffect, useState, useCallback } from 'react';
import { Users as UsersIcon, Loader2, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { fmtDate } from '../lib/ui';

const ROLE_TONE = {
  admin: 'bg-flame-500/15 text-flame-500',
  inspector: 'bg-ember-500/15 text-ember-500',
  user: 'bg-emerald-500/15 text-emerald-500',
};

export default function Users() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await api.get('/auth/users'); setUsers(d.users); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Promote/demote a user (user ↔ inspector ↔ admin); admin-only on the server too.
  const changeRole = async (id, role) => {
    try { await api.put(`/auth/users/${id}/role`, { role }); toast.success('Role updated.'); load(); }
    catch (e) { toast.error(e.message); }
  };

  // Delete a user account (admin-only).
  const remove = async (id) => {
    try { await api.del(`/auth/users/${id}`); toast.success('User deleted.'); load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">User Management</h1>
        <p className="text-slate-500">Manage roles and access (admin only).</p>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-ember-500" size={28} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-white/10">
                <tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Joined</th><th className="p-4 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                    <td className="p-4 font-semibold">{u.firstName} {u.lastName}</td>
                    <td className="p-4 text-slate-500">{u.email}</td>
                    <td className="p-4"><span className={`badge capitalize ${ROLE_TONE[u.role]}`}>{u.role}</span></td>
                    <td className="p-4 text-slate-500">{fmtDate(u.createdAt)}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <select className="input w-auto py-1.5 text-xs" value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}>
                          <option value="user">user</option><option value="inspector">inspector</option><option value="admin">admin</option>
                        </select>
                        <button className="btn btn-ghost py-1.5 text-flame-500" onClick={() => remove(u.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!users.length && <tr><td colSpan={5} className="p-10 text-center text-slate-400"><UsersIcon size={32} className="mx-auto mb-2 opacity-30" /> No users.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
