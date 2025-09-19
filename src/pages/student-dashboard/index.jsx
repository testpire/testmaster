import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NavigationHeader from '../../components/ui/NavigationHeader';
import RoleBasedNavigation from '../../components/ui/RoleBasedNavigation';
import QuickActionPanel from '../../components/ui/QuickActionPanel';
import WelcomeBanner from './components/WelcomeBanner';
import PerformanceAnalytics from './components/PerformanceAnalytics';
import AssignedTests from './components/AssignedTests';
import AIRecommendations from './components/AIRecommendations';
import StudyMaterials from './components/StudyMaterials';
import QuickPractice from './components/QuickPractice';
import WeeklyPerformance from './components/WeeklyPerformance';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, userProfile, signOut, loading } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(null);

  // Use actual user data from AuthContext when available, fallback to mock data for preview
  const currentUser = {
    name: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : "Student",
    firstName: userProfile?.firstName || user?.firstName || "Student",
    role: userProfile?.role || "student",
    avatar: userProfile?.avatar || userProfile?.photo_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    notifications: 3
  };

  useEffect(() => {
    document.title = "Student Dashboard - TestMaster";
  }, []);

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setSignOutError(null);

    try {
      // If user is authenticated, sign out through Supabase
      if (user) {
        const { error } = await signOut();
        if (error) {
          throw error;
        }
      }
      
      // Navigate to login screen after successful logout
      navigate('/login-screen', { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
      setSignOutError(error?.message || 'Failed to sign out. Please try again.');
      
      // Still navigate to login screen even if there was an error
      // This ensures users aren't stuck on the dashboard
      setTimeout(() => {
        navigate('/login-screen', { replace: true });
      }, 2000);
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleMobileNavToggle = () => {
    setIsMobileNavOpen(!isMobileNavOpen);
  };

  const handleQuickAction = (actionId) => {
    switch (actionId) {
      case 'take-test': navigate('/test-taking-interface');
        break;
      case 'practice-mode': setActiveSection('practice');
        break;
      case 'view-progress': navigate('/analytics-and-reports-screen');
        break;
      case 'study-materials': setActiveSection('materials');
        break;
      default:
        console.log('Quick action:', actionId);
    }
  };

  const handleStartTest = (testId) => {
    navigate('/test-taking-interface', { state: { testId } });
  };

  const handleStartPractice = (practiceConfig) => {
    navigate('/test-taking-interface', { state: { practiceConfig, mode: 'practice' } });
  };

  const handleViewMaterial = (materialId, type) => {
    console.log('Viewing material:', materialId, type);
    // In a real app, this would open the material viewer
  };

  const sectionTabs = [
    { id: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
    { id: 'practice', label: 'Practice', icon: 'Target' },
    { id: 'materials', label: 'Materials', icon: 'BookOpen' },
    { id: 'performance', label: 'Performance', icon: 'BarChart3' }
  ];

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'practice':
        return <QuickPractice onStartPractice={handleStartPractice} />;
      case 'materials':
        return <StudyMaterials onViewMaterial={handleViewMaterial} />;
      case 'performance':
        return <WeeklyPerformance />;
      default:
        return (
          <>
            <PerformanceAnalytics />
            <AssignedTests onStartTest={handleStartTest} />
            <AIRecommendations onStartPractice={handleStartPractice} />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sign Out Error Notification */}
      {signOutError && (
        <div className="fixed top-20 right-4 z-[1020] max-w-sm">
          <div className="bg-destructive text-destructive-foreground p-4 rounded-lg shadow-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Sign out failed</p>
                <p className="text-xs mt-1 opacity-90">{signOutError}</p>
              </div>
              <button
                onClick={() => setSignOutError(null)}
                className="ml-2 text-destructive-foreground hover:opacity-80"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Loading Overlay */}
      {isSigningOut && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[1015] flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg shadow-lg border">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              <p className="text-foreground">Signing out...</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <NavigationHeader
        userRole={currentUser?.role}
        userName={currentUser?.name}
        userAvatar={currentUser?.avatar}
        notifications={currentUser?.notifications}
        onLogout={handleLogout}
        onMenuToggle={handleMobileNavToggle}
        showMenuToggle={true}
      />
      {/* Role-based Navigation */}
      <RoleBasedNavigation
        userRole={currentUser?.role}
        activeRoute="/student-dashboard"
        onNavigate={handleNavigation}
        isMobile={window.innerWidth < 1024}
        isOpen={isMobileNavOpen}
        onToggle={handleMobileNavToggle}
      />
      {/* Main Content */}
      <main className={`pt-16 ${currentUser?.role === 'student' ? 'pb-20 lg:pb-4' : ''} ${window.innerWidth >= 1024 ? 'ml-64' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Welcome Banner */}
          <WelcomeBanner
            studentName={currentUser?.firstName}
            studentPhoto={currentUser?.avatar}
            upcomingTests={3}
            completionRate={78}
            currentRank={12}
            totalStudents={150}
          />

          {/* Section Tabs - Desktop */}
          <div className="hidden lg:flex space-x-1 mb-6 bg-muted p-1 rounded-lg">
            {sectionTabs?.map((tab) => (
              <button
                key={tab?.id}
                onClick={() => setActiveSection(tab?.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeSection === tab?.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{tab?.label}</span>
              </button>
            ))}
          </div>

          {/* Section Tabs - Mobile */}
          <div className="lg:hidden mb-6">
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e?.target?.value)}
              className="w-full p-3 bg-card border border-border rounded-lg text-foreground"
            >
              {sectionTabs?.map((tab) => (
                <option key={tab?.id} value={tab?.id}>
                  {tab?.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Content */}
          {renderActiveSection()}
        </div>
      </main>
      {/* Quick Action Panel */}
      <QuickActionPanel
        userRole={currentUser?.role}
        onAction={handleQuickAction}
        variant="floating"
      />
    </div>
  );
};

export default StudentDashboard;