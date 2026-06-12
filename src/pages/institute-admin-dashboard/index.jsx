import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NavigationHeader from '../../components/ui/NavigationHeader';
import RoleBasedNavigation from '../../components/ui/RoleBasedNavigation';
import QuickActionPanel from '../../components/ui/QuickActionPanel';
import StatsCard from '../super-admin-dashboard/components/StatsCard';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { newInstituteService } from '../../services/newInstituteService';
import { newUserService } from '../../services/newUserService';
import { newTestService } from '../../services/newTestService';
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
    totalTests: 0,
    ongoingTests: 0,
    recentStudents: [],
    recentTeachers: [],
    loading: true,
    error: null
  });

  // Get actual user data from authentication
  const currentUser = {
    name: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Admin',
    firstName: userProfile?.firstName || user?.firstName || 'Admin',
    role: userProfile?.role?.toLowerCase()?.replace('_', '-') || 'inst-admin',
    email: userProfile?.email || user?.email,
    avatar: userProfile?.avatar || null,
    notifications: 0,
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

      // Fetch institute details and institute-scoped data.
      // NOTE: do NOT use /super-admin/users here — it is super-admin only and
      // would 403 for an institute admin. The search endpoints are JWT-scoped.
      // Students/teachers searches sort by createdAt desc, so the first page
      // doubles as the "recent" list and carries the total in pagination.
      const [instituteResult, studentsResult, teachersResult, testsResult] = await Promise.all([
        newInstituteService.getInstituteById(currentUser.instituteId),
        newUserService.getStudentsByBatch(null, { page: 0, size: 5 }),
        newUserService.getTeachers({ page: 0, size: 5 }),
        newTestService.listTests(),
      ]);

      let institute = null;

      // getInstitute already returns the unwrapped institute object
      if (instituteResult.data && !instituteResult.error) {
        institute = instituteResult.data;
      }

      const totalStudents = studentsResult?.pagination?.totalElements || 0;
      const totalTeachers = teachersResult?.pagination?.totalElements || 0;

      const tests = Array.isArray(testsResult?.data) ? testsResult.data : [];
      const totalTests = tests.length;
      const ongoingTests = tests.filter(
        (t) => (t?.status || '').toUpperCase() === 'PUBLISHED'
      ).length;

      setInstituteData({
        institute,
        totalStudents,
        totalTeachers,
        totalTests,
        ongoingTests,
        recentStudents: studentsResult?.data || [],
        recentTeachers: teachersResult?.data || [],
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

  // Create stats data from institute state. Values are real, JWT-scoped counts;
  // there is no historical/trend API, so no fabricated "vs last month" change.
  const statsData = [
    {
      title: 'Total Students',
      value: instituteData.loading ? '...' : instituteData.totalStudents?.toLocaleString() || '0',
      icon: 'Users',
      color: 'primary'
    },
    {
      title: 'Total Teachers',
      value: instituteData.loading ? '...' : instituteData.totalTeachers?.toLocaleString() || '0',
      icon: 'GraduationCap',
      color: 'secondary'
    },
    {
      title: 'Published Tests',
      value: instituteData.loading ? '...' : instituteData.ongoingTests?.toString() || '0',
      icon: 'FileText',
      color: 'accent'
    },
    {
      title: 'Total Tests',
      value: instituteData.loading ? '...' : instituteData.totalTests?.toString() || '0',
      icon: 'ClipboardList',
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
      'create-test': '/question-bank',
      'view-analytics': '/inst-admin-dashboard'
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
        <div className="p-4 sm:p-6">
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
                onClick={() => navigate('/teacher-management')}
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
                onClick={() => navigate('/student-management')}
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
                  <span className="text-sm text-muted-foreground">Published Tests</span>
                  <span className="text-sm font-medium">{instituteData.ongoingTests}</span>
                </div>
                {(() => {
                  const inst = instituteData.institute;
                  const isActive = inst?.status
                    ? inst.status.toUpperCase() === 'ACTIVE'
                    : inst?.active !== false;
                  return (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Institute Status</span>
                      <span className={`text-sm font-medium ${isActive ? 'text-success' : 'text-muted-foreground'}`}>
                        {inst?.status
                          ? inst.status.charAt(0).toUpperCase() + inst.status.slice(1).toLowerCase()
                          : isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Recent Students</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/student-management')}>
                  View All
                  <Icon name="ArrowRight" size={14} className="ml-1" />
                </Button>
              </div>
              <div className="space-y-3">
                {instituteData.loading ? (
                  <p className="text-sm text-muted-foreground p-2">Loading…</p>
                ) : instituteData.recentStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">No students enrolled yet.</p>
                ) : (
                  instituteData.recentStudents.map((student) => (
                    <div key={student.id || student.email} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-blue-600">
                          {student.firstName?.[0]?.toUpperCase() || student.username?.[0]?.toUpperCase() || 'S'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {`${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username || 'Unnamed student'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Recent Teachers</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/teacher-management')}>
                  View All
                  <Icon name="ArrowRight" size={14} className="ml-1" />
                </Button>
              </div>
              <div className="space-y-3">
                {instituteData.loading ? (
                  <p className="text-sm text-muted-foreground p-2">Loading…</p>
                ) : instituteData.recentTeachers.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">No teachers added yet.</p>
                ) : (
                  instituteData.recentTeachers.map((teacher) => (
                    <div key={teacher.id || teacher.email} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-green-600">
                          {teacher.firstName?.[0]?.toUpperCase() || teacher.username?.[0]?.toUpperCase() || 'T'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {`${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.username || 'Unnamed teacher'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{teacher.email}</p>
                      </div>
                    </div>
                  ))
                )}
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