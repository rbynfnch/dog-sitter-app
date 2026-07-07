import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Wrap a route with this to require login, and optionally a specific role.
// e.g. <ProtectedRoute role="sitter"><SitterDashboard /></ProtectedRoute>
// Note: this only hides the UI. The real protection is the Supabase RLS
// policies in schema.sql -- a client can never actually write sitter-only
// data even if they hit the API directly.
export default function ProtectedRoute({ children, role }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && profile?.role !== role) return <Navigate to="/" replace />;

  return children;
}
