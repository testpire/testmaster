import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NavigationHeader from '../../components/ui/NavigationHeader';
import RoleBasedNavigation from '../../components/ui/RoleBasedNavigation';
import QuickActionPanel from '../../components/ui/QuickActionPanel';
import StatsCard from '../super-admin-dashboard/components/StatsCard';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { newDashboardService } from '../../services/newDashboardService';
import { newInstituteService } from '../../services/newInstituteService';
import { formatDisplayTime } from '../../utils/timeUtils';
import useSidebar from '../../hooks/useSidebar';

const InstituteAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useSidebar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // No longer need modal states since we use dedicated management pages
  
  // Notification state
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Institute and dashboard data state
  const [instituteData, setInstituteData] = useState({
    institute: null,
    totalStudents: 0,
    totalTeachers: 0,
    ongoingTests: 0,
    loading: true,
    error: null
  });

  // Get actual user data from authentication
  const currentUser = {
    name: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Admin',
    firstName: userProfile?.firstName || user?.firstName || 'Admin',
    role: userProfile?.role?.toLowerCase()?.replace('_', '-') || 'inst-admin',
    email: userProfile?.email || user?.email,
    avatar: userProfile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    notifications: 3,
    instituteId: userProfile?.instituteId || user?.instituteId
  };
  

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Fetch institute and dashboard data
  const fetchInstituteData = async () => {
    try {
      setInstituteData(prev => ({ ...prev, loading: true, error: null }));

      if (!currentUser.instituteId) {
        throw new Error('Institute ID not found for user');
      }

      // Fetch institute details and users
      const [instituteResult, usersResult] = await Promise.all([
        newInstituteService.getInstituteById(currentUser.instituteId),
        newDashboardService.getAllUsers()
      ]);

      let institute = null;
      let totalStudents = 0;
      let totalTeachers = 0;

      // Get institute details
      if (instituteResult.data && !instituteResult.error) {
        institute = instituteResult.data;
      }

      // Filter users by institute and count them
      if (usersResult.data && Array.isArray(usersResult.data)) {
        const instituteUsers = usersResult.data.filter(
          user => user.instituteId === currentUser.instituteId
        );
        totalStudents = instituteUsers.filter(user => user.role === 'STUDENT').length;
        totalTeachers = instituteUsers.filter(user => user.role === 'TEACHER').length;
      }

      setInstituteData({
        institute,
        totalStudents,
        totalTeachers,
        ongoingTests: 8, // This would come from tests API
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching institute data:', error);
      setInstituteData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load institute data'
      }));
    }
  };

  // Load institute data on component mount
  useEffect(() => {
    fetchInstituteData();
  }, [currentUser.instituteId]);

  // Create stats data from institute state
  const statsData = [
    {
      title: 'Total Students',
      value: instituteData.loading ? '...' : instituteData.totalStudents?.toLocaleString() || '0',
      change: '+15.2%',
      changeType: 'increase',
      icon: 'Users',
      color: 'primary'
    },
    {
      title: 'Total Teachers',
      value: instituteData.loading ? '...' : instituteData.totalTeachers?.toLocaleString() || '0',
      change: '+5.1%',
      changeType: 'increase',
      icon: 'GraduationCap',
      color: 'secondary'
    },
    {
      title: 'Ongoing Tests',
      value: instituteData.loading ? '...' : instituteData.ongoingTests?.toString() || '0',
      change: '+12.3%',
      changeType: 'increase',
      icon: 'FileText',
      color: 'accent'
    },
    {
      title: 'Institute Performance',
      value: instituteData.loading ? '...' : '92.4%',
      change: '+2.1%',
      changeType: 'increase',
      icon: 'TrendingUp',
      color: 'success'
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleNavigationAction = (actionId) => {
    // Handle any remaining navigation actions if needed
    console.log('Action:', actionId);
    setMobileMenuOpen(false);
  };

  const handleQuickAction = (actionId) => {
    const actionRoutes = {
      'add-student': '/student-management',
      'add-teacher': '/teacher-management',
      'create-course': '/course-management',
      'create-test': '/test-creation-screen',
      'view-analytics': '/analytics-and-reports-screen'
    };

    if (actionRoutes?.[actionId]) {
      navigate(actionRoutes?.[actionId]);
    }
  };

  const handleLogout = () => {
    navigate('/login-screen');
  };

  // Modal handlers
  const handleUserCreated = (userData) => {
    setNotification({
      show: true,
      message: `${userData?.role === 'TEACHER' ? 'Teacher' : 'Student'} "${userData?.firstName}" created successfully!`,
      type: 'success'
    });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
    // Refresh data after creating user
    fetchInstituteData();
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
      />

      {/* Sidebar Navigation */}
      <RoleBasedNavigation
        userRole={currentUser?.role}
        activeRoute="/inst-admin-dashboard"
        onNavigate={handleNavigation}
        onAction={handleNavigationAction}
        isCollapsed={sidebarCollapsed}
        isMobile={false}
      />

      {/* Mobile Navigation */}
      <RoleBasedNavigation
        userRole={currentUser?.role}
        activeRoute="/inst-admin-dashboard"
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
                  {formatDisplayTime(currentTime)} • {instituteData.institute?.name || 'Institute'} Administration
                </p>
              </div>
              
              <div className="flex items-center gap-2 mt-4 sm:mt-0">
                <Button variant="outline" size="sm" onClick={fetchInstituteData}>
                  <Icon name="RefreshCw" size={16} />
                  <span className="hidden sm:inline">Refresh </span>Data
                </Button>
                
                <Button variant="outline" size="sm">
                  <Icon name="Download" size={16} />
                  <span className="hidden sm:inline">Export </span>Report
                </Button>
              </div>
            </div>
          </div>

          {/* Institute Info Card */}
          {instituteData.institute && (
            <div className="bg-card rounded-lg border border-border p-6 mb-8">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
                    <Icon name="Building" size={32} className="text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{instituteData.institute.name}</h2>
                    <p className="text-muted-foreground">Code: {instituteData.institute.code || instituteData.institute.instituteCode}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {instituteData.institute.city}, {instituteData.institute.state}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {instituteData.totalStudents + instituteData.totalTeachers}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Users</div>
                </div>
              </div>
              {instituteData.institute.description && (
                <p className="text-muted-foreground mt-4">{instituteData.institute.description}</p>
              )}
            </div>
          )}

          {/* Error Message */}
          {instituteData.error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 text-destructive">
                <Icon name="AlertCircle" size={16} />
                <span className="text-sm">Failed to load institute data: {instituteData.error}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={fetchInstituteData}
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

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Create Teacher Card */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Create Teacher</h3>
                  <p className="text-sm text-muted-foreground">Add new teaching staff to your institute</p>
                </div>
                <Icon name="GraduationCap" size={24} className="text-green-600" />
              </div>
              <Button 
                onClick={() => setShowTeacherModal(true)}
                className="w-full"
                variant="outline"
              >
                <Icon name="Plus" size={16} />
                Add Teacher
              </Button>
            </div>

            {/* Create Student Card */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Create Student</h3>
                  <p className="text-sm text-muted-foreground">Enroll new students in your institute</p>
                </div>
                <Icon name="User" size={24} className="text-blue-600" />
              </div>
              <Button 
                onClick={() => setShowStudentModal(true)}
                className="w-full"
                variant="outline"
              >
                <Icon name="Plus" size={16} />
                Add Student
              </Button>
            </div>

            {/* Quick Stats Card */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Quick Overview</h3>
                <Icon name="BarChart3" size={24} className="text-primary" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Student-Teacher Ratio</span>
                  <span className="text-sm font-medium">
                    {instituteData.totalTeachers > 0 ? 
                      Math.round(instituteData.totalStudents / instituteData.totalTeachers) : 0}:1
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Active Tests</span>
                  <span className="text-sm font-medium">{instituteData.ongoingTests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Institute Status</span>
                  <span className="text-sm font-medium text-success">Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Recent Students</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/student-management-screen')}>
                  View All
                  <Icon name="ArrowRight" size={14} className="ml-1" />
                </Button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Icon name="User" size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">New enrollments coming soon</p>
                    <p className="text-xs text-muted-foreground">Check student management for details</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Recent Teachers</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/student-management-screen')}>
                  View All
                  <Icon name="ArrowRight" size={14} className="ml-1" />
                </Button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Icon name="GraduationCap" size={14} className="text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Faculty updates coming soon</p>
                    <p className="text-xs text-muted-foreground">Manage teaching staff efficiently</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Quick Actions */}
      <QuickActionPanel
        userRole={currentUser?.role}
        onAction={handleQuickAction}
        variant="floating"
      />

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

      {/* Modals are no longer needed since we use dedicated management pages */}
    </div>
  );
};

export default InstituteAdminDashboard;