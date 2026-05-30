/**
 * SuperAdminContext — thin compatibility shim.
 *
 * All real state now lives in InstituteContext (src/contexts/InstituteContext.jsx).
 * This module re-exports a useSuperAdmin() hook and SuperAdminProvider that simply
 * forward to InstituteContext so existing callers keep working without changes.
 */
import React, { createContext, useContext } from 'react';
import { useInstitute } from './InstituteContext';

const SuperAdminContext = createContext(null);

export const useSuperAdmin = () => {
  // Always delegate to InstituteContext — InstituteProvider must be above in the tree
  const instituteCtx = useInstitute();

  return {
    allInstitutes: instituteCtx.allInstitutes,
    selectedInstitute: instituteCtx.activeInstitute,
    institutesLoading: instituteCtx.institutesLoading,
    handleInstituteChange: (instituteId) => {
      const institute = instituteCtx.allInstitutes.find(
        (inst) => String(inst.id) === String(instituteId)
      );
      if (institute) {
        instituteCtx.setActiveInstitute(institute);
      }
    },
    fetchInstitutes: instituteCtx.fetchInstitutes,
    setSelectedInstitute: instituteCtx.setActiveInstitute,
  };
};

/**
 * SuperAdminProvider is kept for ProtectedSuperAdminRoutes which wraps children
 * in it. Since InstituteProvider already lives above in App.jsx, this shim simply
 * triggers the institute fetch (for the SUPER_ADMIN role) and renders children.
 */
export const SuperAdminProvider = ({ children }) => {
  // Kick off institute fetch when this wrapper mounts (i.e. super-admin routes entered)
  const instituteCtx = useInstitute();

  React.useEffect(() => {
    // fetchInstitutes is a no-op for non-SUPER_ADMIN (checks localStorage role inside)
    instituteCtx.fetchInstitutes();
  }, []);

  return <>{children}</>;
};
