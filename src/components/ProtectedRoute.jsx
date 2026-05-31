import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardRoute } from '../utils/roleBasedRouting';

/**
 * Generic authentication / role guard.
 *
 * - Unauthenticated                                  → redirected to /login
 * - Authenticated but role not in allowedRoles       → redirected to their own dashboard
 * - allowedRoles omitted/empty                        → any authenticated user may pass
 *
 * Used to protect the role dashboards (/inst-admin-dashboard, /teacher-dashboard,
 * /student-dashboard) and /profile, which were previously rendered without any guard —
 * letting a logged-out user or a lower-privileged role deep-link straight into the
 * admin/teacher shell.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { userProfile, user, loading, initialized } = useAuth();

  // Wait for auth to initialize before deciding (avoids a flash / wrong redirect).
  if (!initialized || loading) {
    return null;
  }

  const rawRole = userProfile?.role || user?.role;

  // Not logged in at all.
  if (!user && !rawRole) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const normalizedRole = rawRole?.toUpperCase()?.replace('-', '_');
    const allowed = allowedRoles.map((r) => r.toUpperCase().replace('-', '_'));
    if (!normalizedRole || !allowed.includes(normalizedRole)) {
      return rawRole
        ? <Navigate to={getDashboardRoute(rawRole)} replace />
        : <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
