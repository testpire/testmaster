import React from 'react';
import { SuperAdminProvider } from '../contexts/SuperAdminContext';
import { useAuth } from '../contexts/AuthContext';

const ProtectedSuperAdminRoutes = ({ children }) => {
  const { userProfile, user } = useAuth();
  
  // Get user role from userProfile or user
  const userRole = userProfile?.role?.toLowerCase()?.replace('_', '-') || user?.role?.toLowerCase()?.replace('_', '-');
  
  // Only wrap with SuperAdminProvider if user is super admin
  if (userRole === 'super-admin') {
    return (
      <SuperAdminProvider>
        {children}
      </SuperAdminProvider>
    );
  }
  
  // For non-super admin users, just return children without context
  return children;
};

export default ProtectedSuperAdminRoutes;
