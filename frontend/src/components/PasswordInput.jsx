// Password field with a show/hide (eye) toggle.
import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({
  value, onChange, placeholder = '••••••••', required = false, withIcon = false, autoComplete,
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      {withIcon && <Lock size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" />}
      <input
        className={`input pr-10 ${withIcon ? 'pl-10' : ''}`}
        type={show ? 'text' : 'password'}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-3 text-slate-400 transition hover:text-ember-500"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
