import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { newInstituteService } from '../services/newInstituteService';
import { useAuth } from './AuthContext';

const InstituteContext = createContext(null);

export const useInstitute = () => {
  const context = useContext(InstituteContext);
  if (!context) {
    throw new Error('useInstitute must be used within an InstituteProvider');
  }
  return context;
};

const ACTIVE_INSTITUTE_KEY = 'activeInstituteId';

const normalizeRole = (role) =>
  (role || '').toString().toUpperCase().replace(/-/g, '_');

const isSuperAdminRole = (role) => {
  const r = normalizeRole(role);
  return r === 'SUPER_ADMIN' || r === 'SUPERADMIN';
};

export const InstituteProvider = ({ children }) => {
  const { user, userProfile, initialized } = useAuth();

  const [allInstitutes, setAllInstitutes] = useState([]);
  const [activeInstitute, setActiveInstituteState] = useState(null);
  const [institutesLoading, setInstitutesLoading] = useState(false);

  // Guards a single fetch per login session. Reset on logout (below) and on a
  // failed fetch (so a transient error can be retried), and bypassed by force.
  const hasFetchedRef = useRef(false);

  // Resolve role from the authenticated profile, falling back to the value the
  // apiClient persists so we still gate correctly during the brief window
  // before the profile resolves on a hard reload.
  const isSuperAdmin = isSuperAdminRole(
    userProfile?.role || user?.role || localStorage.getItem('userRole')
  );

  // Persist to localStorage and update state
  const setActiveInstitute = useCallback((institute) => {
    setActiveInstituteState(institute);
    if (institute?.id != null) {
      localStorage.setItem(ACTIVE_INSTITUTE_KEY, String(institute.id));
    } else {
      localStorage.removeItem(ACTIVE_INSTITUTE_KEY);
    }
  }, []);

  // Fetch institutes from API (SUPER_ADMIN only). Cached for the session: the
  // network call fires once and later calls are no-ops unless force === true
  // (used after a new institute is created).
  const fetchInstitutes = useCallback(async (force = false) => {
    if (!isSuperAdmin) return;
    if (hasFetchedRef.current && !force) return;
    hasFetchedRef.current = true;

    try {
      setInstitutesLoading(true);
      // size:1000 so the cached list holds every institute (the dropdown is the
      // single source of truth) rather than just the first page.
      const { data, error } = await newInstituteService.getInstitutes({}, { page: 0, size: 1000 });

      if (data && !error) {
        const institutes = Array.isArray(data) ? data : [];
        setAllInstitutes(institutes);

        if (institutes.length > 0) {
          // Keep the persisted selection if it still exists; otherwise default
          // to the first institute. On a force-refresh this preserves the
          // super-admin's current selection.
          const persistedId = localStorage.getItem(ACTIVE_INSTITUTE_KEY);
          const persisted = persistedId
            ? institutes.find((inst) => String(inst.id) === persistedId)
            : null;

          setActiveInstitute(persisted || institutes[0]);
        } else {
          setActiveInstitute(null);
        }
      } else {
        console.error('Failed to load institutes:', error);
        setAllInstitutes([]);
        hasFetchedRef.current = false; // allow retry after a failed fetch
      }
    } catch (err) {
      console.error('Error loading institutes:', err);
      setAllInstitutes([]);
      hasFetchedRef.current = false;
    } finally {
      setInstitutesLoading(false);
    }
  }, [isSuperAdmin, setActiveInstitute]);

  // Drive the lifecycle off auth state: fetch once when a super-admin session is
  // established (login or hard reload), and clear the cache on logout so the
  // next session starts fresh. This is the only place the list is auto-fetched.
  useEffect(() => {
    if (!initialized) return;

    if (isSuperAdmin) {
      fetchInstitutes();
    } else if (!user) {
      // Logged out — drop cached institutes and selection.
      hasFetchedRef.current = false;
      setAllInstitutes([]);
      setActiveInstituteState(null);
    }
  }, [initialized, isSuperAdmin, user, fetchInstitutes]);

  const value = {
    allInstitutes,
    activeInstitute,
    institutesLoading,
    setActiveInstitute,
    fetchInstitutes,
  };

  return (
    <InstituteContext.Provider value={value}>
      {children}
    </InstituteContext.Provider>
  );
};

export default InstituteProvider;
