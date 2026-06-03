// Dashboard — real-time overview: KPI stat cards, status/type/inspection charts,
// a compliance watch list and recent activity. Pulls from the Reporting and
// Notification services.
import { useEffect, useState } from 'react';
import {
  FireExtinguisher, AlertTriangle, CalendarClock, Wrench, ShieldCheck, TrendingUp,
} from 'lucide-react';
import { api } from '../api/client';
import { Donut, BarList } from '../components/Charts';
import { useAuth } from '../context/AuthContext';
import { fmtDate, statusTone } from '../lib/ui';

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="card group relative overflow-hidden">
      <div className={`mb-3 grid h-11 w-11 place-items-center rounded-xl ${tone}`}><Icon size={20} /></div>
      <div className="font-display text-3xl font-bold">{value}</div>
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    api.get('/reports/summary').then(setSummary).catch(() => {});
    api.get('/reports/compliance').then(setCompliance).catch(() => {});
    api.get('/notifications').then((d) => setNotifs(d.notifications || [])).catch(() => {});
  }, []);

  const s = summary || {};
  const insp = s.inspections || {};

  return (
    <div className="space-y-6">
      <div className="animate-fadeup">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Dashboard</h1>
        <p className="text-slate-500">Real-time overview of your fire-safety estate, {user?.firstName}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={FireExtinguisher} label="Total Extinguishers" value={s.totalExtinguishers ?? '—'} tone="bg-ember-500/15 text-ember-500" />
        <Stat icon={CalendarClock} label="Pending Inspections" value={insp.Pending ?? 0} tone="bg-amber-500/15 text-amber-500" />
        <Stat icon={AlertTriangle} label="Expired Units" value={(compliance?.expired?.length) ?? 0} tone="bg-flame-500/15 text-flame-500" />
        <Stat icon={Wrench} label="Maintenance Logs" value={s.totalMaintenance ?? 0} tone="bg-emerald-500/15 text-emerald-500" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h3 className="mb-4 font-display font-semibold">Status breakdown</h3>
          <Donut data={s.byStatus} />
        </div>
        <div className="card lg:col-span-1">
          <h3 className="mb-4 font-display font-semibold">By type</h3>
          <BarList data={s.byType} />
        </div>
        <div className="card lg:col-span-1">
          <h3 className="mb-4 font-display font-semibold">Inspections</h3>
          <BarList data={insp} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Compliance */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-500" />
            <h3 className="font-display font-semibold">Compliance watch</h3>
          </div>
          {compliance ? (
            <div className="space-y-2">
              {[...(compliance.expired || []), ...(compliance.expiringSoon || [])].slice(0, 6).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10">
                  <div>
                    <p className="text-sm font-semibold">{c.serial_number}</p>
                    <p className="text-xs text-slate-400">{c.location} · exp {fmtDate(c.expiry_date)}</p>
                  </div>
                  <span className={`badge ${statusTone[c.compliance_status]}`}>{c.compliance_status}</span>
                </div>
              ))}
              {!(compliance.expired?.length || compliance.expiringSoon?.length) && (
                <p className="py-6 text-center text-sm text-emerald-500">All units compliant.</p>
              )}
            </div>
          ) : <p className="text-sm text-slate-400">Loading…</p>}
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-ember-500" />
            <h3 className="font-display font-semibold">Recent activity</h3>
          </div>
          <div className="space-y-2">
            {notifs.slice(0, 6).map((n) => (
              <div key={n.id} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10">
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="text-xs text-slate-400">{n.message}</p>
              </div>
            ))}
            {!notifs.length && <p className="py-6 text-center text-sm text-slate-400">No notifications yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
