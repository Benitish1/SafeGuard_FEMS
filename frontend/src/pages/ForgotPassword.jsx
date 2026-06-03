// Forgot-password page — two steps:
//   (1) enter your email   -> a 6-digit reset code is emailed (purpose=password_reset)
//   (2) enter the code + a new password -> password is reset, then go to sign in.
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, Mail, Loader2, KeyRound, ShieldCheck } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import ThemeToggle from '../components/ThemeToggle';
import PasswordInput from '../components/PasswordInput';
import { emailError } from '../lib/ui';

export default function ForgotPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  // Step 1: request the reset code.
  const requestCode = async (e) => {
    e.preventDefault();
    const emErr = emailError(email);
    if (emErr) return toast.error(emErr);
    setSending(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.info('If that email is registered, a reset code has been sent.');
      setStep('reset');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
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
          <KeyRound size={110} className="mb-6 animate-floaty text-ember-500/80" />
          <h1 className="font-display text-4xl font-bold leading-tight">
            Forgot your <span className="text-ember-500">password?</span>
          </h1>
          <p className="mt-4 max-w-md text-slate-500 dark:text-slate-400">
            No problem. We'll email you a one-time code so you can securely set a new password.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <ShieldCheck size={16} className="text-emerald-500" /> Codes expire in 10 minutes
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <Flame size={44} className="mx-auto animate-flicker text-ember-500" />
            <h1 className="mt-2 font-display text-2xl font-bold">SafeGuard</h1>
          </div>

          <div className="card">
            <h2 className="font-display text-2xl font-bold">Reset password</h2>
            <p className="mb-6 mt-1 text-sm text-slate-500">
              {step === 'email' ? 'Enter your account email to get a code.' : `Enter the code sent to ${email} and your new password.`}
            </p>

            {step === 'email' ? (
              <form onSubmit={requestCode} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" />
                    <input className="input pl-10" type="email" required placeholder="you@safeguard.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase().replace(/\s/g, ''))} />
                  </div>
                </div>
                <button className="btn btn-primary w-full" disabled={sending}>
                  {sending ? <Loader2 size={16} className="animate-spin" /> : null}
                  {sending ? 'Sending…' : 'Send reset code'}
                </button>
              </form>
            ) : (
              <ResetStep email={email} onResend={requestCode} onDone={() => { toast.success('Password reset! Please sign in.'); navigate('/login'); }} />
            )}

            <p className="mt-5 text-center text-sm text-slate-500">
              Remembered it? <Link to="/login" className="font-semibold text-ember-500 hover:underline">Back to sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResetStep({ email, onResend, onDone }) {
  const toast = useToast();
  const [otp, setOtp] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [working, setWorking] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the 6-digit code.');
    if (pw !== confirm) return toast.error('Passwords do not match.');
    if (pw.length < 8) return toast.error('Password must be at least 8 characters.');
    setWorking(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword: pw });
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Verification code</label>
        <input
          ref={inputRef}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••••"
          inputMode="numeric"
          className="input text-center text-2xl font-semibold tracking-[0.6em]"
        />
      </div>
      <div>
        <label className="label">New password</label>
        <PasswordInput required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
      </div>
      <div>
        <label className="label">Confirm new password</label>
        <PasswordInput required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </div>
      <button className="btn btn-primary w-full" disabled={working}>
        {working ? <Loader2 size={16} className="animate-spin" /> : null}
        {working ? 'Resetting…' : 'Reset password'}
      </button>
      <button type="button" onClick={onResend} className="w-full text-sm font-semibold text-ember-500 hover:underline">
        Resend code
      </button>
    </form>
  );
}
