// Register page — two steps: (1) create account, (2) verify email with a 6-digit
// OTP. On successful verification the user is logged in automatically.
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, Loader2, MailCheck, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import ThemeToggle from '../components/ThemeToggle';
import PasswordInput from '../components/PasswordInput';
import { emailError } from '../lib/ui';

export default function Register() {
  const { register, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState('form'); // form | verify
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const emErr = emailError(form.email);
    if (emErr) return toast.error(emErr);
    if (form.password !== form.confirm) return toast.error('Passwords do not match.');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters.');
    setLoading(true);
    try {
      await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password });
      toast.success('Account created! Check your email for a verification code.');
      setStep('verify');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // After verifying the email, log the user straight in — no need to revisit sign-in.
  const handleVerified = async () => {
    try {
      const u = await login(form.email, form.password);
      toast.success(`Welcome aboard, ${u.firstName}! Your email is verified.`);
      navigate('/dashboard');
    } catch {
      toast.success('Email verified! Please sign in.');
      navigate('/login');
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

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
            Join the team keeping <span className="text-ember-500">facilities safe.</span>
          </h1>
          <p className="mt-4 max-w-md text-slate-500 dark:text-slate-400">
            Create your account to register extinguishers, schedule inspections, log
            maintenance and monitor compliance in real time.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> Real-time compliance dashboard</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> Inspection & maintenance tracking</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> PDF & CSV report exports</li>
          </ul>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <ShieldCheck size={16} className="text-emerald-500" /> Email-verified accounts · JWT secured
        </div>
      </div>

      {/* Form / verify panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <Flame size={44} className="mx-auto animate-flicker text-ember-500" />
            <h1 className="mt-2 font-display text-2xl font-bold">SafeGuard</h1>
          </div>

          <div className="card">
            <h2 className="font-display text-2xl font-bold">
              {step === 'form' ? 'Create your account' : 'Verify your email'}
            </h2>
            <p className="mb-6 mt-1 text-sm text-slate-500">
              {step === 'form' ? 'It only takes a minute.' : `We emailed a 6-digit code to ${form.email}.`}
            </p>

            {step === 'form' ? (
              <>
                <form onSubmit={submit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">First name</label>
                      <input className="input" required value={form.firstName} onChange={set('firstName')} />
                    </div>
                    <div>
                      <label className="label">Last name</label>
                      <input className="input" required value={form.lastName} onChange={set('lastName')} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Email</label>
                    {/* Email is forced to lowercase + no spaces as the user types. */}
                    <input className="input" type="email" required value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase().replace(/\s/g, '') })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Password</label>
                      <PasswordInput required autoComplete="new-password" value={form.password} onChange={set('password')} />
                    </div>
                    <div>
                      <label className="label">Confirm</label>
                      <PasswordInput required autoComplete="new-password" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} />
                    </div>
                  </div>
                  <button className="btn btn-primary w-full" disabled={loading}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                    {loading ? 'Creating…' : 'Create account'}
                  </button>
                </form>
                <p className="mt-5 text-center text-sm text-slate-500">
                  Already have an account? <Link to="/login" className="font-semibold text-ember-500 hover:underline">Sign in</Link>
                </p>
              </>
            ) : (
              <VerifyStep email={form.email} onVerified={handleVerified} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VerifyStep({ email, onVerified }) {
  const toast = useToast();
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const verify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the 6-digit code.');
    setVerifying(true);
    try {
      await api.post('/auth/verify-email', { email, otp });
      await onVerified();
    } catch (err) {
      toast.error(err.message);
      setVerifying(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await api.post('/auth/verify-email/resend', { email });
      toast.info('A new code was sent to your email.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={verify} className="space-y-4">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ember-500/15 text-ember-500">
        <MailCheck size={26} />
      </div>
      <input
        ref={inputRef}
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="••••••"
        inputMode="numeric"
        className="input text-center text-2xl font-semibold tracking-[0.6em]"
      />
      <button className="btn btn-primary w-full" disabled={verifying || otp.length !== 6}>
        {verifying ? <Loader2 size={16} className="animate-spin" /> : null}
        {verifying ? 'Verifying…' : 'Verify & continue'}
      </button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={resend} disabled={resending} className="font-semibold text-ember-500 hover:underline">
          {resending ? 'Resending…' : 'Resend code'}
        </button>
        <Link to="/login" className="text-slate-500 hover:underline">Back to sign in</Link>
      </div>
    </form>
  );
}
