import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import NavigationHeader from '../ui/NavigationHeader';
import RoleBasedNavigation from '../ui/RoleBasedNavigation';
import useSidebar from '../../hooks/useSidebar';

const ManagementPageLayout = ({
  title,
  subtitle,
  activeRoute,
  currentUser,
  children,
  headerProps = {},
  sidebarProps = {},
  onNavigation,
  onNavigationAction,
  onMenuToggle
}) => {
  const { user, userProfile } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useSidebar();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleNavigation = (path) => {
    if (onNavigation) {
      onNavigation(path);
    }
    setMobileMenuOpen(false);
  };

  const handleNavigationAction = (actionId) => {
    if (onNavigationAction) {
      onNavigationAction(actionId);
    }
    setMobileMenuOpen(false);
  };

  const handleMenuToggle = () => {
    if (onMenuToggle) {
      onMenuToggle();
    }
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <NavigationHeader
        currentUser={currentUser}
        onNavigate={handleNavigation}
        onSidebarToggle={toggleSidebar}
        showSidebarToggle={true}
        sidebarCollapsed={sidebarCollapsed}
        onMenuToggle={handleMenuToggle}
        showMenuToggle={true}
        {...headerProps}
      />

      {/* Sidebar Navigation */}
      <RoleBasedNavigation
        userRole={currentUser?.role}
        activeRoute={activeRoute}
        onNavigate={handleNavigation}
        onAction={handleNavigationAction}
        isCollapsed={sidebarCollapsed}
        isMobile={false}
        onToggle={() => setMobileMenuOpen(false)}
        {...sidebarProps}
      />

      {/* Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[998] lg:hidden">
          <div className="fixed right-0 top-0 h-full w-64 bg-card transform translate-x-0 transition-transform duration-300 ease-in-out z-[999]">
            <div className="p-4 border-b border-border flex justify-end">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <RoleBasedNavigation
              userRole={currentUser?.role}
              activeRoute={activeRoute}
              onNavigate={handleNavigation}
              onAction={handleNavigationAction}
              isCollapsed={false}
              isMobile={true}
              onToggle={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      } pt-16`}>
        <div className="p-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Page Content */}
          {children}
        </div>
      </div>
    </div>
  );
};

export default ManagementPageLayout;
