import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import NavigationHeader from '../../components/ui/NavigationHeader';
import RoleBasedNavigation from '../../components/ui/RoleBasedNavigation';
import StatsCard from './components/StatsCard';
import QuickActions from './components/QuickActions';
import CreateInstituteModal from './components/CreateInstituteModal';
import CreateUserModal from './components/CreateUserModal';
import UserManagementTree from './components/UserManagementTree';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { newDashboardService } from '../../services/newDashboardService';
import { formatDisplayTime } from '../../utils/timeUtils';
import useSidebar from '../../hooks/useSidebar';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useSidebar();
  const { allInstitutes, selectedInstitute, institutesLoading, handleInstituteChange, fetchInstitutes } = useSuperAdmin();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Modal states
  const [showInstituteModal, setShowInstituteModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showInstAdminModal, setShowInstAdminModal] = useState(false);
  const [showUserManagementTree, setShowUserManagementTree] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Dashboard statistics state — all values come from the backend
  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalInstAdmins: 0,
    totalInstitutes: 0,
    totalUsers: 0,
    instituteUserCount: null, // users in the currently selected institute
    loading: true,
    error: null
  });

  // Get actual user data from authentication
  const currentUser = {
    name: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Admin',
    firstName: userProfile?.firstName || user?.firstName || 'Admin',
    role: userProfile?.role?.toLowerCase()?.replace('_', '-') || 'super-admin',
    email: userProfile?.email || user?.email,
    avatar: userProfile?.avatar || null,
    notifications: 0
  };

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Institutes are now managed by SuperAdminContext

  // Fetch dashboard statistics from the backend.
  // Platform totals come from GET /super-admin/dashboard; the per-institute
  // user count is derived from the real GET /super-admin/users list.
  const fetchDashboardStats = async () => {
    try {
      setDashboardStats(prev => ({ ...prev, loading: true, error: null }));

      const [dashResult, usersResult] = await Promise.all([
        newDashboardService.getSuperAdminDashboard(),
        newDashboardService.getAllUsers(),
      ]);

      if (dashResult.error || !dashResult.data) {
        throw new Error(dashResult.error?.message || 'Dashboard data unavailable');
      }
      const d = dashResult.data;

      // Real count of users belonging to the selected institute
      let instituteUserCount = null;
      if (selectedInstitute?.id && Array.isArray(usersResult.data)) {
        instituteUserCount = usersResult.data.filter(
          user => String(user.instituteId ?? user.institute_id) === String(selectedInstitute.id)
        ).length;
      }

      setDashboardStats({
        totalStudents: d.totalStudents ?? 0,
        totalTeachers: d.totalTeachers ?? 0,
        totalInstAdmins: d.totalInstAdmins ?? 0,
        totalInstitutes: d.totalInstitutes ?? (allInstitutes?.length || 0),
        totalUsers: d.totalUsers ?? 0,
        instituteUserCount,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setDashboardStats(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load dashboard statistics'
      }));
    }
  };

  // Institutes are automatically loaded by SuperAdminContext

  // Fetch stats when selected institute changes
  useEffect(() => {
    if (selectedInstitute) {
      fetchDashboardStats();
    }
  }, [selectedInstitute?.id]);

  // Stats cards — platform-wide totals from GET /super-admin/dashboard.
  // No fabricated trend percentages: the backend does not provide them.
  const statsData = [
    {
      title: 'Total Students',
      value: dashboardStats.loading ? '...' : dashboardStats.totalStudents?.toLocaleString() || '0',
      icon: 'Users',
      color: 'primary'
    },
    {
      title: 'Teachers',
      value: dashboardStats.loading ? '...' : dashboardStats.totalTeachers?.toLocaleString() || '0',
      icon: 'UserCheck',
      color: 'secondary'
    },
    {
      title: 'Institute Admins',
      value: dashboardStats.loading ? '...' : dashboardStats.totalInstAdmins?.toLocaleString() || '0',
      icon: 'ShieldCheck',
      color: 'accent'
    },
    {
      title: 'Institutes',
      value: dashboardStats.loading ? '...' : dashboardStats.totalInstitutes?.toLocaleString() || '0',
      icon: 'Building',
      color: 'success'
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleNavigationAction = (actionId) => {
    switch (actionId) {
      case 'show-user-management':
        setShowUserManagementTree(true);
        break;
      case 'show-institute-modal':
        setShowInstituteModal(true);
        break;
      case 'show-teacher-modal':
        setShowTeacherModal(true);
        break;
      case 'show-student-modal':
        setShowStudentModal(true);
        break;
      case 'show-institute-admin-modal':
        setShowInstAdminModal(true);
        break;
      default:
        console.log('Unknown action:', actionId);
    }
    setMobileMenuOpen(false);
  };

  const handleQuickAction = (route) => {
    if (route) {
      navigate(route);
    }
  };

  const handleLogout = () => {
    navigate('/login-screen');
  };

  // Institute selection is handled by SuperAdminContext

  // Modal handlers
  const handleInstituteCreated = (instituteData) => {
    setNotification({
      show: true,
      message: `Institute "${instituteData?.name}" created successfully!`,
      type: 'success'
    });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
    // Refresh institutes list (force past the session cache to pick up the new one)
    fetchInstitutes(true);
  };

  const handleUserCreated = (userData) => {
    setNotification({
      show: true,
      message: `${userData?.role === 'TEACHER' ? 'Teacher' : userData?.role === 'INST_ADMIN' ? 'Institute Admin' : 'Student'} "${userData?.firstName}" created successfully!`,
      type: 'success'
    });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
    // Refresh data after creating user
    fetchDashboardStats();
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
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
        showInstituteDropdown={true}
        institutes={allInstitutes}
        selectedInstitute={selectedInstitute}
        onInstituteChange={handleInstituteChange}
        institutesLoading={institutesLoading}
      />

      {/* Sidebar Navigation */}
      <RoleBasedNavigation
        userRole={currentUser?.role}
        activeRoute="/super-admin-dashboard"
        onNavigate={handleNavigation}
        onAction={handleNavigationAction}
        isCollapsed={sidebarCollapsed}
        isMobile={false}
      />

      {/* Mobile Navigation */}
      <RoleBasedNavigation
        userRole={currentUser?.role}
        activeRoute="/super-admin-dashboard"
        onNavigate={handleNavigation}
        onAction={handleNavigationAction}
        isMobile={true}
        isOpen={mobileMenuOpen}
        onToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Main Content */}
      <main className={`transition-all duration-300 ease-out ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      } pt-16`}>
        <div className="p-6">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Welcome, {currentUser?.firstName}
                </h1>
                <p className="text-muted-foreground">
                  {formatDisplayTime(currentTime)} • Viewing: {selectedInstitute?.name || 'All Institutes'}
                  {selectedInstitute?.code !== 'ALL' && selectedInstitute?.code && ` (${selectedInstitute.code})`}
                </p>
              </div>
              
              <div className="flex items-center gap-2 mt-4 sm:mt-0">
                <Button variant="outline" size="sm" onClick={fetchDashboardStats} disabled={dashboardStats.loading}>
                  <Icon name="RefreshCw" size={16} />
                  <span className="hidden sm:inline">Refresh </span>Data
                </Button>
              </div>
            </div>
          </div>

          {/* Selected Institute Info Card */}
          {selectedInstitute && selectedInstitute.id !== 'all' && (
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20 p-6 mb-8">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
                    <Icon name="Building" size={32} className="text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{selectedInstitute.name}</h3>
                    <p className="text-muted-foreground">Code: {selectedInstitute.code}</p>
                    {selectedInstitute.city && selectedInstitute.state && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedInstitute.city}, {selectedInstitute.state}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {dashboardStats.loading ? '...' : (dashboardStats.instituteUserCount ?? 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Users in this institute</div>
                </div>
              </div>
              {selectedInstitute.description && (
                <p className="text-muted-foreground mt-4">{selectedInstitute.description}</p>
              )}
            </div>
          )}

          {/* Error Message for Dashboard Stats */}
          {dashboardStats.error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 text-destructive">
                <Icon name="AlertCircle" size={16} />
                <span className="text-sm">Failed to load dashboard statistics: {dashboardStats.error}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={fetchDashboardStats}
                  className="ml-auto text-destructive hover:text-destructive"
                >
                  <Icon name="RefreshCw" size={14} />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsData?.map((stat, index) => (
              <StatsCard
                key={index}
                title={stat?.title}
                value={stat?.value}
                change={stat?.change}
                changeType={stat?.changeType}
                icon={stat?.icon}
                color={stat?.color}
              />
            ))}
          </div>

          {/* Quick Actions - navigation to real management pages */}
          <QuickActions onAction={handleQuickAction} />
        </div>
      </main>

      {/* Success Notification */}
      {notification.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1001,
          backgroundColor: notification.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          maxWidth: '400px'
        }}>
          <Icon 
            name={notification.type === 'success' ? 'CheckCircle' : 'XCircle'} 
            size={20} 
          />
          {notification.message}
          <button
            onClick={() => setNotification({ show: false, message: '', type: 'success' })}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              marginLeft: '8px',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Modals */}
      <CreateInstituteModal
        isOpen={showInstituteModal}
        onClose={() => setShowInstituteModal(false)}
        onSuccess={handleInstituteCreated}
      />

      <CreateUserModal
        isOpen={showTeacherModal}
        onClose={() => setShowTeacherModal(false)}
        onSuccess={handleUserCreated}
        userRole="TEACHER"
        defaultInstituteId={selectedInstitute?.id !== 'all' ? selectedInstitute?.id : undefined}
      />

      <CreateUserModal
        isOpen={showStudentModal}
        onClose={() => setShowStudentModal(false)}
        onSuccess={handleUserCreated}
        userRole="STUDENT"
        defaultInstituteId={selectedInstitute?.id !== 'all' ? selectedInstitute?.id : undefined}
      />

      <CreateUserModal
        isOpen={showInstAdminModal}
        onClose={() => setShowInstAdminModal(false)}
        onSuccess={handleUserCreated}
        userRole="INST_ADMIN"
        defaultInstituteId={selectedInstitute?.id !== 'all' ? selectedInstitute?.id : undefined}
      />

      <UserManagementTree
        isOpen={showUserManagementTree}
        onClose={() => setShowUserManagementTree(false)}
      />
    </div>
  );
};

export default SuperAdminDashboard;