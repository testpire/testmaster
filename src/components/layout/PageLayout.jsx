import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NavigationHeader from '../ui/NavigationHeader';
import RoleBasedNavigation from '../ui/RoleBasedNavigation';
import useSidebar from '../../hooks/useSidebar';
import Button from '../ui/Button';
import Icon from '../AppIcon';

const PageLayout = ({ 
  children, 
  title = "Page",
  showInstituteDropdown = false,
  institutes = [],
  selectedInstitute = null,
  onInstituteChange = null,
  institutesLoading = false
}) => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useSidebar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Error boundary for authentication issues
  // Simplified error handling
  useEffect(() => {
    const handleError = (event) => {
      if (event.error && event.error.message && 
          event.error.message.toLowerCase().includes('chunkloaderror')) {
        // Handle chunk loading errors by refreshing
        console.warn('Chunk loading error detected, refreshing...');
        window.location.reload();
      }
    };

    window.addEventListener('error', handleError);
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <Icon name="AlertCircle" size={64} className="mx-auto text-orange-500 mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Page Temporarily Unavailable
          </h3>
          <p className="text-muted-foreground mb-6">
            {errorMessage}
          </p>
          <div className="space-x-4">
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Refresh Page
            </Button>
            <Button 
              onClick={() => navigate('/super-admin-dashboard')} 
              variant="outline"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Get current user info
  const currentUser = {
    name: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User',
    firstName: userProfile?.firstName || user?.firstName || 'User',
    role: userProfile?.role?.toLowerCase()?.replace('_', '-') || user?.role?.toLowerCase()?.replace('_', '-') || 'student',
    email: userProfile?.email || user?.email,
    avatar: userProfile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    notifications: 3,
    instituteId: userProfile?.instituteId || user?.instituteId
  };

  const handleNavigation = (path) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const handleNavigationAction = (actionId) => {
    // Handle any special navigation actions if needed
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    navigate('/login-screen');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <NavigationHeader
        userRole={currentUser.role}
        userName={currentUser.name}
        userAvatar={currentUser.avatar}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSidebarToggle={toggleSidebar}
        showSidebarToggle={true}
        sidebarCollapsed={sidebarCollapsed}
        notifications={currentUser.notifications}
        showInstituteDropdown={showInstituteDropdown}
        institutes={institutes}
        selectedInstitute={selectedInstitute}
        onInstituteChange={onInstituteChange}
        institutesLoading={institutesLoading}
      />

      {/* Role-based Navigation */}
      <RoleBasedNavigation
        userRole={currentUser.role}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onNavigate={handleNavigation}
        onNavigationAction={handleNavigationAction}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Main Content */}
      <div className={`transition-all duration-300 pt-16 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
