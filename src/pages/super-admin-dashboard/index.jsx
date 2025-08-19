import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationHeader from '../../components/ui/NavigationHeader';
import RoleBasedNavigation from '../../components/ui/RoleBasedNavigation';
import QuickActionPanel from '../../components/ui/QuickActionPanel';
import StatsCard from './components/StatsCard';
import ActivityFeed from './components/ActivityFeed';
import QuickActions from './components/QuickActions';
import SystemAlerts from './components/SystemAlerts';
import AnalyticsChart from './components/AnalyticsChart';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mock user data
  const currentUser = {
    name: 'Dr. Rajesh Kumar',
    role: 'super-admin',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    notifications: 5
  };

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Mock statistics data
  const statsData = [
    {
      title: 'Total Students',
      value: '2,847',
      change: '+12.5%',
      changeType: 'increase',
      icon: 'Users',
      color: 'primary'
    },
    {
      title: 'Active Teachers',
      value: '156',
      change: '+3.2%',
      changeType: 'increase',
      icon: 'UserCheck',
      color: 'secondary'
    },
    {
      title: 'Ongoing Tests',
      value: '23',
      change: '+8.1%',
      changeType: 'increase',
      icon: 'FileText',
      color: 'accent'
    },
    {
      title: 'System Performance',
      value: '98.7%',
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

  const formatTime = (date) => {
    return date?.toLocaleString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
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
        notifications={currentUser?.notifications}
      />
      {/* Sidebar Navigation */}
      <RoleBasedNavigation
        userRole={currentUser?.role}
        activeRoute="/super-admin-dashboard"
        onNavigate={handleNavigation}
        isCollapsed={sidebarCollapsed}
        isMobile={false}
      />
      {/* Mobile Navigation */}
      <RoleBasedNavigation
        userRole={currentUser?.role}
        activeRoute="/super-admin-dashboard"
        onNavigate={handleNavigation}
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
                  Welcome back, {currentUser?.name?.split(' ')?.[1]}! 👋
                </h1>
                <p className="text-muted-foreground">
                  {formatTime(currentTime)} • TestMaster Admin Dashboard
                </p>
              </div>
              
              <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="hidden lg:flex"
                >
                  <Icon name={sidebarCollapsed ? "PanelLeftOpen" : "PanelLeftClose"} size={20} />
                </Button>
                
                <Button variant="outline">
                  <Icon name="Download" size={16} />
                  Export Report
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

          {/* Additional Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Recent Enrollments</h3>
                <Icon name="TrendingUp" size={20} className="text-success" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">JEE Main 2025</span>
                  <span className="text-sm font-medium text-foreground">+45 students</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">NEET 2025</span>
                  <span className="text-sm font-medium text-foreground">+32 students</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">CBSE Class 12</span>
                  <span className="text-sm font-medium text-foreground">+28 students</span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Top Performing Batches</h3>
                <Icon name="Award" size={20} className="text-warning" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Batch 2024-A</span>
                  <span className="text-sm font-medium text-success">94.2%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Batch 2024-B</span>
                  <span className="text-sm font-medium text-success">91.8%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Batch 2024-C</span>
                  <span className="text-sm font-medium text-success">89.5%</span>
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
    </div>
  );
};

export default SuperAdminDashboard;