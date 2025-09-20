import { useState, useEffect } from 'react';

const useSidebar = (defaultCollapsed = false) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Try to get the saved state from localStorage
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved !== null ? JSON.parse(saved) : defaultCollapsed;
  });

  // Save to localStorage whenever the state changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar
  };
};

export default useSidebar;
