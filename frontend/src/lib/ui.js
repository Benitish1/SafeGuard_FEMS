// Shared UI helpers (status colors, date formatting).
export const statusTone = {
  Active: 'bg-emerald-500/15 text-emerald-500',
  Inactive: 'bg-slate-500/15 text-slate-400',
  Expired: 'bg-flame-500/15 text-flame-500',
  'Needs Maintenance': 'bg-amber-500/15 text-amber-500',
  Decommissioned: 'bg-slate-500/15 text-slate-400',
  Pending: 'bg-ember-500/15 text-ember-500',
  Completed: 'bg-emerald-500/15 text-emerald-500',
  Overdue: 'bg-flame-500/15 text-flame-500',
  Cancelled: 'bg-slate-500/15 text-slate-400',
  Compliant: 'bg-emerald-500/15 text-emerald-500',
  'Expiring Soon': 'bg-amber-500/15 text-amber-500',
};

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');

// Email rule: must contain "@" and have NO capital letters.
export function emailError(email) {
  const v = String(email || '').trim();
  if (!v.includes('@')) return 'Email must contain "@".';
  if (v !== v.toLowerCase()) return 'Email must be lowercase — capital letters are not allowed.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'Please enter a valid email address.';
  return null;
}
