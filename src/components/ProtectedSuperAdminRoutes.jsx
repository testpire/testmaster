import React from 'react';
import { Navigate } from 'react-router-dom';
import { SuperAdminProvider } from '../contexts/SuperAdminContext';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardRoute } from '../utils/roleBasedRouting';

const ProtectedSuperAdminRoutes = ({ children }) => {
  const { userProfile, user, loading, initialized } = useAuth();

  // Wait for auth to initialize before making a redirect decision
  if (!initialized || loading) {
    return null;
  }

  // Get user role from userProfile or user (raw role string, e.g. SUPER_ADMIN)
  const rawRole = userProfile?.role || user?.role;
  const normalizedRole = rawRole?.toUpperCase()?.replace('-', '_');

  // Super admins get the full context — everyone else is redirected
  if (normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'SUPERADMIN') {
    return (
      <SuperAdminProvider>
        {children}
      </SuperAdminProvider>
    );
  }

  // Logged-in non-super-admin: send to their own dashboard
  if (rawRole) {
    return <Navigate to={getDashboardRoute(rawRole)} replace />;
  }

  // Not logged in at all: send to login
  return <Navigate to="/login" replace />;
};

export default ProtectedSuperAdminRoutes;
