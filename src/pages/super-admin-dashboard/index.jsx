import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NavigationHeader from '../../components/ui/NavigationHeader';
import RoleBasedNavigation from '../../components/ui/RoleBasedNavigation';
import QuickActionPanel from '../../components/ui/QuickActionPanel';
import StatsCard from './components/StatsCard';
import ActivityFeed from './components/ActivityFeed';
import QuickActions from './components/QuickActions';
import SystemAlerts from './components/SystemAlerts';
import AnalyticsChart from './components/AnalyticsChart';
import CreateInstituteModal from './components/CreateInstituteModal';
import CreateUserModal from './components/CreateUserModal';
import UserManagementTree from './components/UserManagementTree';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { newDashboardService } from '../../services/newDashboardService';
import { newInstituteService } from '../../services/newInstituteService';
import { formatDisplayTime } from '../../utils/timeUtils';
import useSidebar from '../../hooks/useSidebar';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useSidebar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Institute selection state
  const [allInstitutes, setAllInstitutes] = useState([]);
  const [selectedInstitute, setSelectedInstitute] = useState(null);
  const [institutesLoading, setInstitutesLoading] = useState(true);
  
  // Modal states
  const [showInstituteModal, setShowInstituteModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showInstAdminModal, setShowInstAdminModal] = useState(false);
  const [showUserManagementTree, setShowUserManagementTree] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Dashboard statistics state
  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: 0,
    activeTeachers: 0,
    ongoingTests: 0,
    systemPerformance: 98.7,
    instituteName: '',
    instituteCode: '',
    loading: true,
    error: null
  });

  // Get actual user data from authentication
  const currentUser = {
    name: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Admin',
    firstName: userProfile?.firstName || user?.firstName || 'Admin',
    role: userProfile?.role?.toLowerCase()?.replace('_', '-') || 'super-admin',
    email: userProfile?.email || user?.email,
    avatar: userProfile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    notifications: 5
  };

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Fetch all institutes for dropdown
  const fetchInstitutes = async () => {
    try {
      setInstitutesLoading(true);
      const result = await newInstituteService.getInstitutes();
      
      if (result.data && !result.error) {
        const institutes = Array.isArray(result.data) ? result.data : [result.data];
        
        const allInstitutesWithDefault = [
          { id: 'all', name: 'All Institutes', code: 'ALL' },
          ...institutes
        ];
        
        setAllInstitutes(allInstitutesWithDefault);
        
        // Set default selection to "All Institutes"
        if (!selectedInstitute) {
          setSelectedInstitute({ id: 'all', name: 'All Institutes', code: 'ALL' });
        }
      } else {
        console.error('Error fetching institutes:', result.error);
        setAllInstitutes([{ id: 'all', name: 'All Institutes', code: 'ALL' }]);
        setSelectedInstitute({ id: 'all', name: 'All Institutes', code: 'ALL' });
      }
    } catch (error) {
      console.error('Error fetching institutes:', error);
      setAllInstitutes([{ id: 'all', name: 'All Institutes', code: 'ALL' }]);
      setSelectedInstitute({ id: 'all', name: 'All Institutes', code: 'ALL' });
    } finally {
      setInstitutesLoading(false);
    }
  };

  // Fetch dashboard statistics based on selected institute
  const fetchDashboardStats = async () => {
    try {
      setDashboardStats(prev => ({ ...prev, loading: true, error: null }));

      // Get all users to filter by institute
      const usersResult = await newDashboardService.getAllUsers();
      
      let totalStudents = 0;
      let activeTeachers = 0;
      let filteredUsers = [];
      
      if (usersResult.data && Array.isArray(usersResult.data)) {
        // Filter users based on selected institute
        if (selectedInstitute?.id === 'all') {
          filteredUsers = usersResult.data;
        } else if (selectedInstitute?.id) {
          filteredUsers = usersResult.data.filter(
            user => user.instituteId === selectedInstitute.id || user.institute_id === selectedInstitute.id
          );
        }
        
        totalStudents = filteredUsers.filter(user => user.role === 'STUDENT').length;
        activeTeachers = filteredUsers.filter(user => user.role === 'TEACHER').length;
      }

      // Set dashboard stats
      setDashboardStats({
        totalStudents,
        activeTeachers,
        ongoingTests: Math.floor(Math.random() * 30) + 10, // Mock data for now
        systemPerformance: 98.7,
        instituteName: selectedInstitute?.name || '',
        instituteCode: selectedInstitute?.code || '',
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setDashboardStats(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load dashboard statistics'
      }));
    }
  };

  // Load institutes on component mount
  useEffect(() => {
    fetchInstitutes();
  }, []);

  // Fetch stats when selected institute changes
  useEffect(() => {
    if (selectedInstitute) {
      fetchDashboardStats();
    }
  }, [selectedInstitute]);

  // Create stats data from dashboard state
  const statsData = [
    {
      title: 'Total Students',
      value: dashboardStats.loading ? '...' : dashboardStats.totalStudents?.toLocaleString() || '0',
      change: '+12.5%',
      changeType: 'increase',
      icon: 'Users',
      color: 'primary'
    },
    {
      title: 'Active Teachers',
      value: dashboardStats.loading ? '...' : dashboardStats.activeTeachers?.toLocaleString() || '0',
      change: '+3.2%',
      changeType: 'increase',
      icon: 'UserCheck',
      color: 'secondary'
    },
    {
      title: 'Ongoing Tests',
      value: dashboardStats.loading ? '...' : dashboardStats.ongoingTests?.toString() || '0',
      change: '+8.1%',
      changeType: 'increase',
      icon: 'FileText',
      color: 'accent'
    },
    {
      title: 'System Performance',
      value: dashboardStats.loading ? '...' : `${dashboardStats.systemPerformance}%` || '0%',
      change: '+0.3%',
      changeType: 'increase',
      icon: 'Activity',
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

  const handleQuickAction = (actionId) => {
    const actionRoutes = {
      'add-student': '/student-management-screen',
      'add-teacher': '/student-management-screen',
      'create-course': '/course-and-batch-management-screen',
      'create-test': '/test-creation-screen',
      'view-analytics': '/analytics-and-reports-screen',
      'system-settings': '/super-admin-dashboard'
    };

    if (actionRoutes?.[actionId]) {
      navigate(actionRoutes?.[actionId]);
    }
  };

  const handleLogout = () => {
    navigate('/login-screen');
  };

  // Institute selection handler
  const handleInstituteChange = (instituteId) => {
    const institute = allInstitutes.find(inst => inst.id === instituteId);
    if (institute) {
      setSelectedInstitute(institute);
    }
  };

  // Modal handlers
  const handleInstituteCreated = (instituteData) => {
    setNotification({
      show: true,
      message: `Institute "${instituteData?.name}" created successfully!`,
      type: 'success'
    });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
    // Refresh institutes list
    fetchInstitutes();
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
                <Button variant="outline" size="sm" onClick={fetchDashboardStats}>
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
                    {dashboardStats.totalStudents + dashboardStats.activeTeachers}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Users</div>
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

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Activity Feed - Left Column */}
            <div className="lg:col-span-1">
              <ActivityFeed />
            </div>

            {/* Quick Actions - Center Column */}
            <div className="lg:col-span-1">
              <QuickActions onAction={handleQuickAction} />
            </div>

            {/* System Alerts - Right Column */}
            <div className="lg:col-span-1">
              <SystemAlerts />
            </div>
          </div>

          {/* Analytics Chart - Full Width */}
          <div className="mb-8">
            <AnalyticsChart />
          </div>

          {/* Institute-Specific Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedInstitute?.id === 'all' ? 'All Enrollments' : 'Recent Enrollments'}
                </h3>
                <Icon name="TrendingUp" size={20} className="text-success" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">New Students</span>
                  <span className="text-sm font-medium text-foreground">
                    +{Math.floor(Math.random() * 20) + 5} this week
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">New Teachers</span>
                  <span className="text-sm font-medium text-foreground">
                    +{Math.floor(Math.random() * 5) + 1} this week
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Tests</span>
                  <span className="text-sm font-medium text-foreground">
                    {dashboardStats.ongoingTests} ongoing
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Performance Overview</h3>
                <Icon name="Award" size={20} className="text-warning" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg. Test Score</span>
                  <span className="text-sm font-medium text-success">
                    {(85 + Math.random() * 10).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Student Satisfaction</span>
                  <span className="text-sm font-medium text-success">
                    {(90 + Math.random() * 8).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Course Completion</span>
                  <span className="text-sm font-medium text-success">
                    {(78 + Math.random() * 15).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">System Status</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span className="text-sm text-success">All Systems Operational</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Database</span>
                  <span className="text-sm font-medium text-success">Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">API Services</span>
                  <span className="text-sm font-medium text-success">Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">File Storage</span>
                  <span className="text-sm font-medium text-success">Online</span>
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