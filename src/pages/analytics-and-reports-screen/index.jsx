import React, { useState, useEffect } from 'react';
import NavigationHeader from '../../components/ui/NavigationHeader';
import RoleBasedNavigation from '../../components/ui/RoleBasedNavigation';
import QuickActionPanel from '../../components/ui/QuickActionPanel';
import PerformanceKPICards from './components/PerformanceKPICards';
import AnalyticsFilters from './components/AnalyticsFilters';
import PerformanceCharts from './components/PerformanceCharts';
import DetailedDataTable from './components/DetailedDataTable';
import WeakAreaAnalysis from './components/WeakAreaAnalysis';
import ReportGenerator from './components/ReportGenerator';

import Button from '../../components/ui/Button';

const AnalyticsAndReportsScreen = () => {
  const [userRole, setUserRole] = useState('teacher');
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [filters, setFilters] = useState({
    timeRange: 'last-30-days',
    subject: 'all',
    batch: 'all',
    testType: 'all',
    difficulty: 'all',
    startDate: '',
    endDate: ''
  });

  // Mock KPI data
  const kpiData = {
    averageScore: 78.5,
    scoreChange: 5.2,
    completionRate: 92,
    completionChange: 3.1,
    totalTests: 156,
    testsChange: 12,
    activeStudents: 458,
    studentsChange: 8.5
  };

  // Mock chart data
  const chartData = {
    subjectPerformance: [],
    accuracyTrends: [],
    difficultyAnalysis: [],
    timeAnalysis: []
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'BarChart3' },
    { id: 'student-performance', label: 'Student Performance', icon: 'Users' },
    { id: 'test-analysis', label: 'Test Analysis', icon: 'FileText' },
    { id: 'weak-areas', label: 'Weak Areas', icon: 'AlertTriangle' },
    { id: 'reports', label: 'Reports', icon: 'Download' }
  ];

  useEffect(() => {
    // Simulate data loading based on filters
    console.log('Filters updated:', filters);
  }, [filters]);

  const handleFilterChange = (key, value) => {
    if (key === 'reset') {
      setFilters({
        timeRange: 'last-30-days',
        subject: 'all',
        batch: 'all',
        testType: 'all',
        difficulty: 'all',
        startDate: '',
        endDate: ''
      });
    } else {
      setFilters(prev => ({
        ...prev,
        [key]: value
      }));
    }
  };

  const handleExportData = () => {
    console.log('Exporting data with filters:', filters);
    // Simulate export functionality
    alert('Data export initiated. You will receive an email with the exported data shortly.');
  };

  const handleGenerateReport = () => {
    console.log('Generating report with filters:', filters);
    // Simulate report generation
    alert('Report generation started. The report will be available for download in a few minutes.');
  };

  const handleQuickAction = (actionId) => {
    console.log('Quick action triggered:', actionId);
    switch (actionId) {
      case 'create-test':
        window.location.href = '/test-creation-screen';
        break;
      case 'view-results': setActiveTab('test-analysis');
        break;
      case 'add-student':
        window.location.href = '/student-management-screen';
        break;
      case 'schedule-test': alert('Test scheduling feature coming soon!');
        break;
      default:
        break;
    }
  };

  const handleLogout = () => {
    console.log('User logged out');
    window.location.href = '/login-screen';
  };

  const handleNavigation = (path) => {
    console.log('Navigating to:', path);
    window.location.href = path;
  };

  const handleGenerateRecommendations = () => {
    console.log('Generating AI recommendations');
    alert('AI-powered recommendations are being generated. This may take a few moments.');
  };

  const handleGenerateCustomReport = (reportConfig) => {
    console.log('Generating custom report:', reportConfig);
    return new Promise((resolve) => {
      setTimeout(() => {
        alert(`${reportConfig.reportType} report generated successfully in ${reportConfig.format} format!`);
        resolve();
      }, 2000);
    });
  };

  const handleScheduleReport = (reportConfig) => {
    console.log('Scheduling report:', reportConfig);
    alert(`Report scheduled for ${reportConfig?.deliveryFrequency} delivery!`);
  };

  const handleExportCSV = () => {
    console.log('Exporting CSV data');
    alert('CSV export initiated. Download will start shortly.');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <PerformanceKPICards 
              kpiData={kpiData} 
              selectedTimeRange={filters?.timeRange}
            />
            <PerformanceCharts 
              chartData={chartData} 
              selectedFilters={filters}
            />
          </div>
        );
      
      case 'student-performance':
        return (
          <DetailedDataTable 
            tableData={[]}
            tableType="students"
            onExportCSV={handleExportCSV}
          />
        );
      
      case 'test-analysis':
        return (
          <DetailedDataTable 
            tableData={[]}
            tableType="tests"
            onExportCSV={handleExportCSV}
          />
        );
      
      case 'weak-areas':
        return (
          <WeakAreaAnalysis 
            weakAreasData={[]}
            onGenerateRecommendations={handleGenerateRecommendations}
          />
        );
      
      case 'reports':
        return (
          <ReportGenerator 
            onGenerateReport={handleGenerateCustomReport}
            onScheduleReport={handleScheduleReport}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <NavigationHeader
        userRole={userRole}
        userName="Dr. Sarah Johnson"
        userAvatar="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
        onLogout={handleLogout}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        showMenuToggle={true}
        notifications={3}
      />
      {/* Role-based Navigation */}
      <RoleBasedNavigation
        userRole={userRole}
        activeRoute="/analytics-and-reports-screen"
        onNavigate={handleNavigation}
        isCollapsed={isSidebarCollapsed}
        isMobile={window.innerWidth < 1024}
        isOpen={isMobileMenuOpen}
        onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      {/* Main Content */}
      <div className={`transition-all duration-300 ${
        window.innerWidth >= 1024 
          ? (isSidebarCollapsed ? 'ml-16' : 'ml-64') 
          : 'ml-0'
      } pt-16`}>
        <div className="p-6">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Analytics & Reports</h1>
              <p className="text-muted-foreground mt-2">
                Comprehensive performance insights and data visualization for tracking student progress
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                iconName={isSidebarCollapsed ? "PanelLeftOpen" : "PanelLeftClose"}
                className="hidden lg:flex"
              />
              <Button
                variant="default"
                onClick={() => window.location?.reload()}
                iconName="RefreshCw"
                iconPosition="left"
              >
                Refresh Data
              </Button>
            </div>
          </div>

          {/* Analytics Filters */}
          <AnalyticsFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onExportData={handleExportData}
            onGenerateReport={handleGenerateReport}
            availableOptions={{}}
          />

          {/* Tab Navigation */}
          <div className="bg-card rounded-lg border border-border mb-6">
            <div className="flex items-center space-x-1 p-2 overflow-x-auto">
              {tabs?.map((tab) => (
                <Button
                  key={tab?.id}
                  variant={activeTab === tab?.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab(tab?.id)}
                  iconName={tab?.icon}
                  iconPosition="left"
                  className="whitespace-nowrap"
                >
                  {tab?.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[600px]">
            {renderTabContent()}
          </div>
        </div>
      </div>
      {/* Quick Action Panel */}
      <QuickActionPanel
        userRole={userRole}
        onAction={handleQuickAction}
        variant="floating"
      />
      {/* Mobile Bottom Navigation Spacer */}
      {userRole === 'student' && window.innerWidth < 768 && (
        <div className="h-20"></div>
      )}
    </div>
  );
};

export default AnalyticsAndReportsScreen;