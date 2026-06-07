import React from 'react';
import { Navigate } from 'react-router-dom';
import { SuperAdminProvider } from '../contexts/SuperAdminContext';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardRoute } from '../utils/roleBasedRouting';

/**
 * Guard for the test-authoring pages (/test-management).
 *
 * Like ProtectedManagementRoutes, but TEACHERs are also allowed in — teachers
 * curate the question bank and author/assign tests for their students.
 *
 * - SUPER_ADMIN          → renders children inside SuperAdminProvider (institute switcher)
 * - INST_ADMIN / TEACHER → renders children directly (backend scopes data to their JWT institute)
 * - Any other authenticated role → redirected to their own dashboard
 * - Unauthenticated → redirected to /login
 */
const ProtectedTestManagementRoutes = ({ children }) => {
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

  if (
    normalizedRole === 'INST_ADMIN' ||
    normalizedRole === 'INSTITUTE_ADMIN' ||
    normalizedRole === 'ADMIN' ||
    normalizedRole === 'TEACHER' ||
    normalizedRole === 'INSTRUCTOR'
  ) {
    // InstituteProvider is mounted app-wide in App.jsx, so useInstitute() resolves
    // without SuperAdminProvider here.
    return <>{children}</>;
  }

  // Logged-in role without access (STUDENT, …): send to their dashboard
  if (rawRole) {
    return <Navigate to={getDashboardRoute(rawRole)} replace />;
  }

  // Not logged in
  return <Navigate to="/login" replace />;
};

export default ProtectedTestManagementRoutes;
