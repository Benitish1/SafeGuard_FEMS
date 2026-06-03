// Two-step secure confirmation used for LOGOUT and all DELETE actions:
//   Step 1 — "Are you sure?"  (explicit confirmation)
//   Step 2 — Enter the 6-digit OTP emailed to the user, then run the action.
import { useState, useRef, useEffect } from 'react';
import { ShieldAlert, Mail, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function ConfirmOtpDialog({
  open, onClose, title, message, confirmLabel = 'Yes, continue',
  purpose, reference = null, onConfirm,
}) {
  const toast = useToast();
  const [step, setStep] = useState('confirm'); // 'confirm' = are-you-sure, 'otp' = code entry
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false); // requesting/resending a code
  const [working, setWorking] = useState(false); // running the final action
  const inputRef = useRef(null);

  // Reset back to the confirm step every time the dialog re-opens.
  useEffect(() => {
    if (open) { setStep('confirm'); setOtp(''); }
  }, [open]);

  // Auto-focus the code field when we reach the OTP step.
  useEffect(() => {
    if (step === 'otp') setTimeout(() => inputRef.current?.focus(), 50);
  }, [step]);

  // Step 1 → 2: ask the server to email a code (purpose/reference identify the action),
  // then advance to the code-entry step.
  const requestCode = async () => {
    setSending(true);
    try {
      await api.post('/auth/otp/request', { purpose, reference });
      toast.info('Verification code sent to your email.');
      setStep('otp');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  // Step 2: hand the typed code to the caller's onConfirm (which performs the real
  // request, e.g. DELETE with { otp }). Close on success; show the error otherwise.
  const submit = async () => {
    if (otp.length !== 6) return toast.error('Enter the 6-digit code.');
    setWorking(true);
    try {
      await onConfirm(otp);
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-md">
      {step === 'confirm' ? (
        <div>
          <div className="mb-5 flex gap-4 rounded-xl border border-flame-500/30 bg-flame-500/5 p-4">
            <ShieldAlert className="mt-0.5 shrink-0 text-flame-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
          </div>
          <p className="mb-5 text-xs text-slate-500">
            For your security, this action must be confirmed with a one-time code sent to your email.
          </p>
          <div className="flex justify-end gap-3">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-danger" onClick={requestCode} disabled={sending}>
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              {sending ? 'Sending…' : confirmLabel}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
            We emailed a 6-digit code. Enter it below to confirm.
          </p>
          <input
            ref={inputRef}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••••"
            inputMode="numeric"
            className="input mb-4 text-center text-2xl tracking-[0.6em] font-semibold"
          />
          <div className="flex items-center justify-between">
            <button onClick={requestCode} disabled={sending} className="text-xs font-semibold text-ember-500 hover:underline">
              {sending ? 'Resending…' : 'Resend code'}
            </button>
            <div className="flex gap-3">
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-danger" onClick={submit} disabled={working || otp.length !== 6}>
                {working ? <Loader2 size={16} className="animate-spin" /> : null}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
