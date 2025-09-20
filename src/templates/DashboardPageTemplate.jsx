import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NavigationHeader from '../components/ui/NavigationHeader';
import RoleBasedNavigation from '../components/ui/RoleBasedNavigation';
import useSidebar from '../hooks/useSidebar';

/**
 * Template for dashboard pages with professional sidebar toggle
 * Copy this template and customize for your specific page needs
 */
const DashboardPageTemplate = ({ 
  children, 
  activeRoute = "/dashboard",
  userRole = "student" 
}) => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useSidebar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get actual user data from authentication
  const currentUser = {
    name: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User',
    role: userProfile?.role?.toLowerCase()?.replace('_', '-') || userRole,
    email: userProfile?.email || user?.email,
    avatar: userProfile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    notifications: 5
  };

  const handleNavigation = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    navigate('/login-screen');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header with Professional Sidebar Toggle */}
      <NavigationHeader
        userRole={currentUser?.role}
        userName={currentUser?.name}
        userAvatar={currentUser?.avatar}
        onLogout={handleLogout}
        onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        showMenuToggle={true}
        onSidebarToggle={toggleSidebar}
        showSidebarToggle={true}
        sidebarCollapsed={sidebarCollapsed}
        notifications={currentUser?.notifications}
      />

      {/* Desktop Sidebar Navigation */}
      <RoleBasedNavigation
        userRole={currentUser?.role}
        activeRoute={activeRoute}
        onNavigate={handleNavigation}
        isCollapsed={sidebarCollapsed}
        isMobile={false}
      />

      {/* Mobile Navigation */}
      <RoleBasedNavigation
        userRole={currentUser?.role}
        activeRoute={activeRoute}
        onNavigate={handleNavigation}
        isMobile={true}
        isOpen={mobileMenuOpen}
        onToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Main Content with Responsive Margins */}
      <main className={`transition-all duration-300 ease-out ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      } pt-16`}>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardPageTemplate;

/**
 * Usage Example:
 * 
 * import DashboardPageTemplate from '../../templates/DashboardPageTemplate';
 * 
 * const MyPage = () => {
 *   return (
 *     <DashboardPageTemplate activeRoute="/my-page" userRole="teacher">
 *       <div>
 *         <h1>My Page Content</h1>
 *         <p>This page uses the professional sidebar toggle</p>
 *       </div>
 *     </DashboardPageTemplate>
 *   );
 * };
 */
