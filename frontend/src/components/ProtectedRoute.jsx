// ProtectedRoute — gate for authenticated routes. Shows a loader while the
// session restores, redirects to /login if not signed in, and to /dashboard if
// the user's role isn't in the optional `roles` allow-list.
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame } from 'lucide-react';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Flame className="animate-flicker text-ember-500" size={48} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}
