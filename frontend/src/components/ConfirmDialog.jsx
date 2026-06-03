// Simple "Are you sure?" confirmation (no OTP) — used for logout.
import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { useToast } from '../context/ToastContext';

export default function ConfirmDialog({
  open, onClose, title, message, confirmLabel = 'Yes, continue', onConfirm,
}) {
  const toast = useToast();
  const [working, setWorking] = useState(false);

  const run = async () => {
    setWorking(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="mb-5 flex gap-4 rounded-xl border border-flame-500/30 bg-flame-500/5 p-4">
        <AlertTriangle className="mt-0.5 shrink-0 text-flame-500" size={20} />
        <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      </div>
      <div className="flex justify-end gap-3">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={run} disabled={working}>
          {working ? <Loader2 size={16} className="animate-spin" /> : null}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
