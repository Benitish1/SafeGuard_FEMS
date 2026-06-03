// Modal — generic centered dialog with a blurred backdrop. Click outside or the
// X to close. Used by forms, confirmations and OTP dialogs across the app.
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeup" onClick={onClose} />
      <div className={`glass relative w-full ${maxWidth} animate-fadeup p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
