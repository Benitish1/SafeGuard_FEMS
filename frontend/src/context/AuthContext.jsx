// AuthContext — holds the signed-in user and exposes auth actions to the whole app.
// The JWT lives in localStorage; on load we call /auth/me to restore the session.
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // null = not signed in
  const [loading, setLoading] = useState(true); // true while we restore the session on first load

  // On app start (and after token changes), try to fetch the current user using
  // the stored JWT. If the token is missing/expired we clear it and stay logged out.
  const loadMe = useCallback(async () => {
    if (!localStorage.getItem('fems_token')) { setLoading(false); return; }
    try {
      const { user } = await api.get('/auth/me'); // validates the token server-side
      setUser(user);
    } catch {
      localStorage.removeItem('fems_token'); // token invalid/expired → drop it
    } finally {
      setLoading(false); // either way, we're done checking
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]); // run once when the provider mounts

  // Exchange email+password for tokens, persist them, and cache the user object.
  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('fems_token', data.accessToken);     // short-lived access token
    localStorage.setItem('fems_refresh', data.refreshToken || ''); // long-lived refresh token
    setUser(data.user);
    return data.user; // returned so callers can greet the user / route by role
  };

  // Create an account (returns { needsVerification, email } — verification is a separate step).
  const register = (payload) => api.post('/auth/register', payload);

  // Clear the local session (called after a server-side logout, password change,
  // or account deletion). Does NOT itself hit the server.
  const clearSession = () => {
    localStorage.removeItem('fems_token');
    localStorage.removeItem('fems_refresh');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
