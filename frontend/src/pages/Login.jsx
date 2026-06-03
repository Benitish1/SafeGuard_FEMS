// Login page — email + password sign-in. Validates the email (lowercase, must
// contain "@") before calling AuthContext.login, then routes to the dashboard.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, Mail, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ThemeToggle from '../components/ThemeToggle';
import PasswordInput from '../components/PasswordInput';
import { emailError } from '../lib/ui';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const emErr = emailError(form.email);
    if (emErr) return toast.error(emErr);
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      toast.success(`Welcome back, ${u.firstName}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="app-bg" />
      <div className="absolute right-5 top-5 z-10"><ThemeToggle /></div>

      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="absolute inset-0 -z-10" style={{ backgroundImage: 'linear-gradient(150deg, rgba(249,115,22,.18), rgba(239,68,68,.10) 60%, transparent)' }} />
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-glow" style={{ backgroundImage: 'linear-gradient(135deg,#f97316,#ef4444)' }}>
            <Flame size={26} className="animate-flicker" />
          </div>
          <span className="font-display text-xl font-bold">SafeGuard</span>
        </div>
        <div>
          <Flame size={120} className="mb-6 animate-floaty text-ember-500/80" />
          <h1 className="font-display text-4xl font-bold leading-tight">
            Keep every building <span className="text-ember-500">safe & compliant.</span>
          </h1>
          <p className="mt-4 max-w-md text-slate-500 dark:text-slate-400">
            Track extinguishers, schedule inspections, log maintenance and generate real-time
            compliance reports — all from one secure dashboard.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <ShieldCheck size={16} className="text-emerald-500" /> Secured with JWT + OTP verification
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <Flame size={44} className="mx-auto animate-flicker text-ember-500" />
            <h1 className="mt-2 font-display text-2xl font-bold">SafeGuard</h1>
          </div>
          <div className="card">
            <h2 className="font-display text-2xl font-bold">Sign in</h2>
            <p className="mb-6 mt-1 text-sm text-slate-500">Access your fire-safety dashboard.</p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" />
                  {/* Email is forced to lowercase + no spaces as the user types. */}
                  <input className="input pl-10" type="email" required placeholder="you@safeguard.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase().replace(/\s/g, '') })} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="label">Password</label>
                  <Link to="/forgot-password" className="mb-1.5 text-xs font-semibold text-ember-500 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput withIcon required autoComplete="current-password"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <button className="btn btn-primary w-full" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-slate-500">
              No account? <Link to="/register" className="font-semibold text-ember-500 hover:underline">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
