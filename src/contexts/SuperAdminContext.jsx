import React, { createContext, useContext, useState, useEffect } from 'react';
import { newInstituteService } from '../services/newInstituteService';

const SuperAdminContext = createContext();

export const useSuperAdmin = () => {
  const context = useContext(SuperAdminContext);
  if (!context) {
    throw new Error('useSuperAdmin must be used within a SuperAdminProvider');
  }
  return context;
};

export const SuperAdminProvider = ({ children }) => {
  const [allInstitutes, setAllInstitutes] = useState([]);
  const [selectedInstitute, setSelectedInstitute] = useState(null);
  const [institutesLoading, setInstitutesLoading] = useState(true);

  // Load institutes on provider mount
  const fetchInstitutes = async () => {
    try {
      setInstitutesLoading(true);
      const { data, error } = await newInstituteService.getInstitutes();
      
      if (data && !error) {
        const institutes = Array.isArray(data) ? data : [];
        setAllInstitutes(institutes);
        
        // Auto-select first institute if none selected and institutes exist
        if (!selectedInstitute && institutes.length > 0) {
          setSelectedInstitute(institutes[0]);
        }
      } else {
        console.error('Failed to load institutes:', error);
        setAllInstitutes([]);
      }
    } catch (error) {
      console.error('Error loading institutes:', error);
      setAllInstitutes([]);
    } finally {
      setInstitutesLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutes();
  }, []);

  const handleInstituteChange = (instituteId) => {
    const institute = allInstitutes.find(inst => inst.id === parseInt(instituteId));
    if (institute) {
      setSelectedInstitute(institute);
    }
  };

  const value = {
    allInstitutes,
    selectedInstitute,
    institutesLoading,
    handleInstituteChange,
    fetchInstitutes,
    setSelectedInstitute
  };

  return (
    <SuperAdminContext.Provider value={value}>
      {children}
    </SuperAdminContext.Provider>
  );
};
