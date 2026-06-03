// Layout — the authenticated app shell: sidebar navigation (role-filtered),
// top bar with notifications bell, theme toggle, user chip, and logout.
// Renders the active page via <Outlet />.
import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  Flame, LayoutDashboard, FireExtinguisher, CalendarCheck, Wrench,
  BarChart3, Users, UserCircle, LogOut, Bell, Menu, X,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ConfirmDialog from './ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/extinguishers', label: 'Extinguishers', icon: FireExtinguisher },
  { to: '/inspections', label: 'Inspections', icon: CalendarCheck },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench, roles: ['admin', 'inspector'] },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
  { to: '/profile', label: 'Profile', icon: UserCircle },
];

export default function Layout() {
  const { user, clearSession } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);

  // Fetch the user's notifications + unread count for the bell.
  const loadNotifs = useCallback(async () => {
    try {
      const d = await api.get('/notifications');
      setNotifs(d.notifications || []);
      setUnread(d.unread || 0);
    } catch { /* ignore — bell just stays empty */ }
  }, []);

  // Load on mount, then auto-refresh every 25s so new notifications (e.g. a user
  // requesting an inspection) appear on the bell without reopening it.
  useEffect(() => {
    loadNotifs();
    const id = setInterval(loadNotifs, 25000);
    return () => clearInterval(id);
  }, [loadNotifs]);

  // Open/close the dropdown; refresh the list each time it's opened.
  const toggleNotif = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) loadNotifs();
  };
  const markAll = async () => { try { await api.put('/notifications/read-all'); loadNotifs(); } catch { /* */ } };
  const markOne = async (id) => { try { await api.put(`/notifications/${id}/read`); loadNotifs(); } catch { /* */ } };

  // Logout: revoke sessions server-side, then clear the local session and redirect.
  const doLogout = async () => {
    await api.post('/auth/logout');
    clearSession();
    toast.success('Logged out securely.');
    navigate('/login');
  };

  // Hide nav items the current role isn't allowed to see (e.g. Users for admins only).
  const visibleNav = nav.filter((n) => !n.roles || n.roles.includes(user?.role));
  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : '';

  return (
    <div className="min-h-screen">
      <div className="app-bg" />

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white/80 p-4 backdrop-blur-xl transition-transform dark:border-white/10 dark:bg-ink-800/80 lg:translate-x-0 ${sidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl text-white shadow-glow" style={{ backgroundImage: 'linear-gradient(135deg,#f97316,#ef4444)' }}>
            <Flame size={22} className="animate-flicker" />
          </div>
          <div>
            <p className="font-display text-base font-bold leading-tight">Safe<span className="text-ember-500">Guard</span></p>
            <p className="text-[10px] uppercase tracking-widest text-slate-400">Fire Mgmt System</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setSidebar(false)}><X size={20} /></button>
        </div>

        <nav className="space-y-1.5">
          {visibleNav.map((n) => (
            <NavLink key={n.to} to={n.to} onClick={() => setSidebar(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <n.icon size={18} /> {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute inset-x-4 bottom-4">
          <button onClick={() => setLogoutOpen(true)} className="nav-link w-full text-flame-500 hover:bg-flame-500/10">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/70 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-ink-900/60 sm:px-6">
          <button className="lg:hidden" onClick={() => setSidebar(true)}><Menu size={22} /></button>
          <div className="hidden sm:block">
            <p className="text-sm text-slate-400">Welcome back,</p>
            <p className="-mt-0.5 font-display font-semibold">{user?.firstName} {user?.lastName}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative">
              <button onClick={toggleNotif} className="relative rounded-xl border border-slate-200 p-2.5 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5">
                <Bell size={18} />
                {unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-flame-500 text-[9px] font-bold text-white">{unread}</span>}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card animate-fadeup dark:border-white/10 dark:bg-ink-800">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
                      <p className="font-display font-semibold">Notifications</p>
                      {notifs.length > 0 && (
                        <button onClick={markAll} className="text-xs font-semibold text-ember-500 hover:underline">Mark all read</button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifs.length === 0 ? (
                        <p className="p-8 text-center text-sm text-slate-400">No notifications yet.</p>
                      ) : notifs.map((n) => (
                        <button key={n.id} onClick={() => markOne(n.id)}
                          className={`flex w-full items-start gap-2 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5 ${!n.isRead ? 'bg-ember-500/5' : ''}`}>
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-ember-500'}`} />
                          <span>
                            <span className="block text-sm font-semibold">{n.title}</span>
                            <span className="block text-xs text-slate-400">{n.message}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <ThemeToggle />
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 py-1 pl-1 pr-3 dark:border-white/10">
              <div className="grid h-8 w-8 place-items-center rounded-lg text-xs font-bold text-white" style={{ backgroundImage: 'linear-gradient(135deg,#f97316,#ef4444)' }}>{initials}</div>
              <span className="badge bg-ember-500/15 text-ember-500 capitalize">{user?.role}</span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {sidebar && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebar(false)} />}

      <ConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="Confirm logout"
        message="Are you sure you want to log out? This will end and revoke all your active sessions."
        confirmLabel="Yes, log me out"
        onConfirm={doLogout}
      />
    </div>
  );
}
