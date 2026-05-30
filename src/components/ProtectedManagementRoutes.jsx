import React from 'react';
import { Navigate } from 'react-router-dom';
import { SuperAdminProvider } from '../contexts/SuperAdminContext';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardRoute } from '../utils/roleBasedRouting';

/**
 * Guard for pages shared between SUPER_ADMIN and INST_ADMIN:
 *   /teacher-management, /student-management, /course-management, /question-bank
 *
 * - SUPER_ADMIN  → renders children inside SuperAdminProvider (institute fetch + context)
 * - INST_ADMIN   → renders children directly (backend scopes data to their JWT institute)
 * - Any other authenticated role → redirected to their own dashboard
 * - Unauthenticated → redirected to /login
 */
const ProtectedManagementRoutes = ({ children }) => {
  const { userProfile, user, loading, initialized } = useAuth();

  // Wait for auth to initialize before making a redirect decision
  if (!initialized || loading) {
    return null;
  }

  const rawRole = userProfile?.role || user?.role;
  const normalizedRole = rawRole?.toUpperCase()?.replace('-', '_');

  if (normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'SUPERADMIN') {
    return (
      <SuperAdminProvider>
        {children}
      </SuperAdminProvider>
    );
  }

  if (normalizedRole === 'INST_ADMIN' || normalizedRole === 'INSTITUTE_ADMIN' || normalizedRole === 'ADMIN') {
    // InstituteProvider is already mounted app-wide in App.jsx, so useSuperAdmin()
    // / useInstitute() will resolve without SuperAdminProvider here.
    return <>{children}</>;
  }

  // Logged-in role that doesn't have access (TEACHER, STUDENT, …): send to their dashboard
  if (rawRole) {
    return <Navigate to={getDashboardRoute(rawRole)} replace />;
  }

  // Not logged in
  return <Navigate to="/login" replace />;
};

export default ProtectedManagementRoutes;
