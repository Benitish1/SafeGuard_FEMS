import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();
let idSeq = 0;

const icons = { success: CheckCircle2, error: XCircle, info: Info };
const tones = {
  success: 'border-emerald-500/40 text-emerald-500',
  error: 'border-flame-500/50 text-flame-500',
  info: 'border-ember-500/50 text-ember-500',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback((message, type = 'info') => {
    const id = ++idSeq;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const toast = {
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-3">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div key={t.id}
              className={`glass animate-fadeup flex items-start gap-3 border-l-4 px-4 py-3 pr-10 min-w-[260px] max-w-sm ${tones[t.type]}`}>
              <Icon size={20} className="mt-0.5 shrink-0" />
              <p className="text-sm text-slate-700 dark:text-slate-200">{t.message}</p>
              <button onClick={() => remove(t.id)} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
