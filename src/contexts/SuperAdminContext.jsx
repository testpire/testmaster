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
 * in it. The institute list is now fetched once per session and cached by
 * InstituteProvider (driven off auth state), so this wrapper no longer triggers
 * a fetch on every mount — it simply renders children.
 */
export const SuperAdminProvider = ({ children }) => {
  return <>{children}</>;
};
