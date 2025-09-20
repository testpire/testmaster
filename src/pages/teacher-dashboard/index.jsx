import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NavigationHeader from '../../components/ui/NavigationHeader';
import RoleBasedNavigation from '../../components/ui/RoleBasedNavigation';
import QuickActionPanel from '../../components/ui/QuickActionPanel';
import StatsCard from '../super-admin-dashboard/components/StatsCard';
import CreateUserModal from '../super-admin-dashboard/components/CreateUserModal';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { newDashboardService } from '../../services/newDashboardService';
import { formatDisplayTime } from '../../utils/timeUtils';
import useSidebar from '../../hooks/useSidebar';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useSidebar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Modal states
  const [showStudentModal, setShowStudentModal] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Teacher dashboard data state
  const [teacherData, setTeacherData] = useState({
    myStudents: 45,
    myClasses: 8,
    pendingTests: 3,
    avgPerformance: 87.5,
    loading: false,
    error: null
  });

  // Get actual user data from authentication
  const currentUser = {
    name: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Teacher',
    firstName: userProfile?.firstName || user?.firstName || 'Teacher',
    role: userProfile?.role?.toLowerCase()?.replace('_', '-') || 'teacher',
    email: userProfile?.email || user?.email,
    avatar: userProfile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    notifications: 4,
    instituteId: userProfile?.instituteId || user?.instituteId
  };

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Fetch teacher dashboard data
  const fetchTeacherData = async () => {
    try {
      setTeacherData(prev => ({ ...prev, loading: true, error: null }));

      const [dashboardResult] = await Promise.all([
        newDashboardService.getTeacherDashboard()
      ]);

      if (dashboardResult.data && !dashboardResult.error) {
        setTeacherData({
          myStudents: dashboardResult.data.myStudents || 45,
          myClasses: dashboardResult.data.myClasses || 8,
          pendingTests: dashboardResult.data.pendingTests || 3,
          avgPerformance: dashboardResult.data.avgPerformance || 87.5,
          loading: false,
          error: null
        });
      } else {
        // Use fallback data
        setTeacherData({
          myStudents: 45,
          myClasses: 8,
          pendingTests: 3,
          avgPerformance: 87.5,
          loading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      // Use fallback data even on error
      setTeacherData({
        myStudents: 45,
        myClasses: 8,
        pendingTests: 3,
        avgPerformance: 87.5,
        loading: false,
        error: null
      });
    }
  };

  // Load teacher data on component mount
  useEffect(() => {
    fetchTeacherData();
  }, []);

  // Create stats data from teacher state
  const statsData = [
    {
      title: 'My Students',
      value: teacherData.loading ? '...' : teacherData.myStudents?.toString() || '0',
      change: '+8%',
      changeType: 'increase',
      icon: 'Users',
      color: 'primary'
    },
    {
      title: 'My Classes',
      value: teacherData.loading ? '...' : teacherData.myClasses?.toString() || '0',
      change: '+2',
      changeType: 'increase',
      icon: 'BookOpen',
      color: 'secondary'
    },
    {
      title: 'Pending Tests',
      value: teacherData.loading ? '...' : teacherData.pendingTests?.toString() || '0',
      change: '-1',
      changeType: 'decrease',
      icon: 'FileText',
      color: 'accent'
    },
    {
      title: 'Avg Performance',
      value: teacherData.loading ? '...' : `${teacherData.avgPerformance}%` || '0%',
      change: '+3.2%',
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
    switch (actionId) {
      case 'show-student-modal':
        setShowStudentModal(true);
        break;
      default:
        console.log('Unknown action:', actionId);
    }
    setMobileMenuOpen(false);
  };

  const handleQuickAction = (actionId) => {
    const actionRoutes = {
      'add-student': '/student-management-screen',
      'add-teacher': '/student-management-screen',
      'create-course': '/course-and-batch-management-screen',
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
      message: `Student "${userData?.firstName}" created successfully!`,
      type: 'success'
    });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
    // Refresh data after creating user
    fetchTeacherData();
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
        activeRoute="/teacher-dashboard"
        onNavigate={handleNavigation}
        onAction={handleNavigationAction}
        isCollapsed={sidebarCollapsed}
        isMobile={false}
      />

      {/* Mobile Navigation */}
      <RoleBasedNavigation
        userRole={currentUser?.role}
        activeRoute="/teacher-dashboard"
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
                  {formatDisplayTime(currentTime)} • Teaching Portal
                </p>
              </div>
              
              <div className="flex items-center gap-2 mt-4 sm:mt-0">
                <Button variant="outline" size="sm" onClick={fetchTeacherData}>
                  <Icon name="RefreshCw" size={16} />
                  <span className="hidden sm:inline">Refresh </span>Data
                </Button>
              </div>
            </div>
          </div>

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

          {/* Teacher Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Create Test Card */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Create Test</h3>
                  <p className="text-sm text-muted-foreground">Design new assessments for your students</p>
                </div>
                <Icon name="FileText" size={24} className="text-accent" />
              </div>
              <Button 
                onClick={() => navigate('/test-creation-screen')}
                className="w-full"
                variant="outline"
              >
                <Icon name="Plus" size={16} />
                Create Test
              </Button>
            </div>

            {/* Add Student Card */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Add Student</h3>
                  <p className="text-sm text-muted-foreground">Enroll new students to your classes</p>
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

            {/* View Analytics Card */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Class Analytics</h3>
                  <p className="text-sm text-muted-foreground">Monitor student performance</p>
                </div>
                <Icon name="BarChart3" size={24} className="text-success" />
              </div>
              <Button 
                onClick={() => navigate('/analytics-and-reports-screen')}
                className="w-full"
                variant="outline"
              >
                <Icon name="Eye" size={16} />
                View Analytics
              </Button>
            </div>
          </div>

          {/* Teacher Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Recent Tests</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/test-creation-screen')}>
                  View All
                  <Icon name="ArrowRight" size={14} className="ml-1" />
                </Button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                  <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                    <Icon name="FileText" size={14} className="text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Mathematics Quiz - Chapter 5</p>
                    <p className="text-xs text-muted-foreground">Created 2 days ago • 45 students</p>
                  </div>
                  <div className="text-sm text-success font-medium">87%</div>
                </div>
                <div className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                  <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                    <Icon name="FileText" size={14} className="text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Physics Lab Test</p>
                    <p className="text-xs text-muted-foreground">Created 5 days ago • 38 students</p>
                  </div>
                  <div className="text-sm text-success font-medium">92%</div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Upcoming Classes</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/course-and-batch-management-screen')}>
                  View All
                  <Icon name="ArrowRight" size={14} className="ml-1" />
                </Button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                  <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center">
                    <Icon name="BookOpen" size={14} className="text-secondary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Advanced Mathematics</p>
                    <p className="text-xs text-muted-foreground">Today at 10:00 AM • Room 204</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                  <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center">
                    <Icon name="BookOpen" size={14} className="text-secondary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Physics Lab Session</p>
                    <p className="text-xs text-muted-foreground">Tomorrow at 2:00 PM • Lab 3</p>
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

      {/* Modals */}
      <CreateUserModal
        isOpen={showStudentModal}
        onClose={() => setShowStudentModal(false)}
        onSuccess={handleUserCreated}
        userRole="STUDENT"
        defaultInstituteId={currentUser.instituteId}
      />
    </div>
  );
};

export default TeacherDashboard;