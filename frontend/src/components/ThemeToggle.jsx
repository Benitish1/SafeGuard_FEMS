// ThemeToggle — animated dark/light switch backed by ThemeContext.
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative flex h-9 w-16 items-center rounded-full border border-slate-300 bg-slate-100 px-1 transition dark:border-white/10 dark:bg-white/5"
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-white shadow-glow transition-all duration-300 ${dark ? 'translate-x-7' : 'translate-x-0'}`}
        style={{ backgroundImage: 'linear-gradient(135deg,#f97316,#ef4444)' }}
      >
        {dark ? <Moon size={15} /> : <Sun size={15} />}
      </span>
    </button>
  );
}
