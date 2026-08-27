import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * Protected route component for role-based access control
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {Array} [props.allowedRoles=[]] - Allowed roles
 * @param {boolean} [props.requireAuth=true] - Require authentication
 * @returns {JSX.Element} Protected route
 */
export function ProtectedRoute({ children, allowedRoles = [], requireAuth = true }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}