import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { newInstituteService } from '../services/newInstituteService';

const InstituteContext = createContext(null);

export const useInstitute = () => {
  const context = useContext(InstituteContext);
  if (!context) {
    throw new Error('useInstitute must be used within an InstituteProvider');
  }
  return context;
};

const ACTIVE_INSTITUTE_KEY = 'activeInstituteId';

export const InstituteProvider = ({ children }) => {
  const [allInstitutes, setAllInstitutes] = useState([]);
  const [activeInstitute, setActiveInstituteState] = useState(null);
  const [institutesLoading, setInstitutesLoading] = useState(false);

  // Persist to localStorage and update state
  const setActiveInstitute = useCallback((institute) => {
    setActiveInstituteState(institute);
    if (institute?.id != null) {
      localStorage.setItem(ACTIVE_INSTITUTE_KEY, String(institute.id));
    } else {
      localStorage.removeItem(ACTIVE_INSTITUTE_KEY);
    }
  }, []);

  // Fetch institutes from API (only called for SUPER_ADMIN)
  const fetchInstitutes = useCallback(async () => {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'SUPER_ADMIN') return;

    try {
      setInstitutesLoading(true);
      const { data, error } = await newInstituteService.getInstitutes();

      if (data && !error) {
        const institutes = Array.isArray(data) ? data : [];
        setAllInstitutes(institutes);

        if (institutes.length > 0) {
          // Try to hydrate from persisted id
          const persistedId = localStorage.getItem(ACTIVE_INSTITUTE_KEY);
          const persisted = persistedId
            ? institutes.find((inst) => String(inst.id) === persistedId)
            : null;

          // Default to first institute if nothing persisted or persisted id is stale
          setActiveInstitute(persisted || institutes[0]);
        } else {
          setActiveInstitute(null);
        }
      } else {
        console.error('Failed to load institutes:', error);
        setAllInstitutes([]);
      }
    } catch (err) {
      console.error('Error loading institutes:', err);
      setAllInstitutes([]);
    } finally {
      setInstitutesLoading(false);
    }
  }, [setActiveInstitute]);

  // Auto-fetch on mount if the user is already a SUPER_ADMIN (page refresh)
  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'SUPER_ADMIN') {
      fetchInstitutes();
    }
  }, [fetchInstitutes]);

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
