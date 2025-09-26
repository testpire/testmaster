import React, { useState, useEffect, useCallback } from 'react';
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
  const [retryCount, setRetryCount] = useState(0);
  
  // Comprehensive error recovery system
  const resetError = useCallback(() => {
    setHasError(false);
    setErrorMessage('');
    setRetryCount(0);
  }, []);

  // Auto-recovery after errors
  useEffect(() => {
    if (hasError && retryCount < 3) {
      const timer = setTimeout(() => {
        console.log(`🔄 Auto-recovering from error (attempt ${retryCount + 1}/3)`);
        resetError();
      }, 3000); // Auto-recover after 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [hasError, retryCount, resetError]);

  // Comprehensive error boundary
  useEffect(() => {
    const handleError = (event) => {
      const error = event.error || event.reason;
      const errorMsg = error?.message || error?.toString() || 'Unknown error';
      
      console.warn('🚨 Global error caught:', errorMsg);
      
      // Handle specific error types
      if (errorMsg.toLowerCase().includes('chunkloaderror')) {
        console.log('📦 Chunk loading error - refreshing page');
        window.location.reload();
        return;
      }
      
      if (errorMsg.toLowerCase().includes('network') || 
          errorMsg.toLowerCase().includes('fetch') ||
          errorMsg.toLowerCase().includes('timeout')) {
        console.log('🌐 Network error - attempting recovery');
        setErrorMessage('Network connection issue. Recovering...');
        setHasError(true);
        setRetryCount(prev => prev + 1);
        return;
      }
      
      if (errorMsg.toLowerCase().includes('unauthorized') || 
          errorMsg.toLowerCase().includes('403') ||
          errorMsg.toLowerCase().includes('401') ||
          error?.isAuthRedirect) {
        console.log('🔒 Authentication error - handled by API client');
        // Don't show error page for auth issues - API client handles redirect
        return;
      }
      
      // Generic error recovery - redirect to dashboard if user is still authenticated
      if (user && currentUser && !errorMsg.toLowerCase().includes('auth')) {
        console.log('🔄 User still authenticated, redirecting to dashboard');
        const dashboardPath = currentUser.role === 'SUPER_ADMIN' ? '/super-admin-dashboard' :
                             currentUser.role === 'INST_ADMIN' ? '/inst-admin-dashboard' :
                             '/teacher-dashboard';
        window.location.replace(dashboardPath);
        return;
      }
      
      // Standard error recovery for unauthenticated users
      if (retryCount < 3) {
        console.log('🔧 Generic error - attempting recovery');
        setErrorMessage('Temporary issue detected. Recovering...');
        setHasError(true);
        setRetryCount(prev => prev + 1);
      } else {
        console.log('❌ Max retries reached - showing error page');
        setErrorMessage('Unable to recover automatically. Please refresh the page.');
        setHasError(true);
      }
    };

    const handleUnhandledRejection = (event) => {
      console.warn('🚨 Unhandled promise rejection:', event.reason);
      handleError({ error: event.reason });
    };

    // Listen for all types of errors
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [retryCount]);

  // Prevent render errors from crashing the app
  const safeRender = useCallback((renderFunction) => {
    try {
      return renderFunction();
    } catch (error) {
      console.error('🚨 Render error caught:', error);
      setErrorMessage('Page rendering issue. Recovering...');
      setHasError(true);
      setRetryCount(prev => prev + 1);
      return null;
    }
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <Icon name="RefreshCw" size={48} className="mx-auto text-blue-500 mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {retryCount < 3 ? 'Recovering...' : 'Temporary Issue'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {errorMessage}
          </p>
          {retryCount < 3 ? (
            <div className="text-sm text-blue-600">
              Auto-recovering in {3 - (Date.now() % 3000) / 1000 | 0}s (Attempt {retryCount + 1}/3)
            </div>
          ) : (
            <div className="space-x-4">
              <Button 
                onClick={resetError} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
              >
                Refresh Page
              </Button>
            </div>
          )}
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

  return safeRender(() => (
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
        onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        showMenuToggle={true}
        notifications={currentUser.notifications}
        showInstituteDropdown={showInstituteDropdown}
        institutes={institutes}
        selectedInstitute={selectedInstitute}
        onInstituteChange={onInstituteChange}
        institutesLoading={institutesLoading}
      />

      {/* Desktop Sidebar Navigation */}
      <RoleBasedNavigation
        userRole={currentUser.role}
        activeRoute={window.location.pathname}
        onNavigate={handleNavigation}
        onAction={handleNavigationAction}
        isCollapsed={sidebarCollapsed}
        isMobile={false}
      />

      {/* Mobile Navigation */}
      <RoleBasedNavigation
        userRole={currentUser.role}
        activeRoute={window.location.pathname}
        onNavigate={handleNavigation}
        onAction={handleNavigationAction}
        isMobile={true}
        isOpen={mobileMenuOpen}
        onToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Main Content with proper mobile margins */}
      <div className={`transition-all duration-300 pt-16 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      } ${currentUser.role === 'student' ? 'mb-16 md:mb-0' : ''}`}>
        {children}
      </div>
    </div>
  )) || (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center p-8">
        <Icon name="RefreshCw" size={48} className="mx-auto text-blue-500 mb-4 animate-spin" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};

export default PageLayout;
