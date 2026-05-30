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
import { courseService } from '../../services/courseService';
import { questionService } from '../../services/questionService';
import { newUserService } from '../../services/newUserService';
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

  // Real, API-derived counts for the teacher's institute
  const [stats, setStats] = useState({
    students: 0,
    courses: 0,
    subjects: 0,
    questions: 0,
    loading: true,
  });
  const [courses, setCourses] = useState([]);

  // Get actual user data from authentication
  const currentUser = {
    name: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Teacher',
    firstName: userProfile?.firstName || user?.firstName || 'Teacher',
    role: userProfile?.role?.toLowerCase()?.replace('_', '-') || 'teacher',
    email: userProfile?.email || user?.email,
    avatar: userProfile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
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

  // Fetch real dashboard data (institute is scoped by the JWT on the backend)
  const fetchTeacherData = async () => {
    setStats(prev => ({ ...prev, loading: true }));
    try {
      const [studentsRes, coursesRes, subjectsRes, questionsRes] = await Promise.all([
        newUserService.getStudentsByBatch(null, { page: 0, size: 1 }),
        courseService.getCourses({ page: 0, size: 100 }),
        courseService.getSubjects(null, { page: 0, size: 1 }),
        questionService.searchQuestions({ page: 0, size: 1 }),
      ]);

      setCourses(coursesRes?.data || []);
      setStats({
        students: studentsRes?.pagination?.totalElements || 0,
        courses: coursesRes?.pagination?.totalElements ?? (coursesRes?.data?.length || 0),
        subjects: subjectsRes?.pagination?.totalElements || 0,
        questions: questionsRes?.pagination?.totalElements || 0,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const statsData = [
    { title: 'My Students', value: stats.loading ? '...' : String(stats.students), icon: 'Users', color: 'primary' },
    { title: 'Courses', value: stats.loading ? '...' : String(stats.courses), icon: 'BookOpen', color: 'secondary' },
    { title: 'Subjects', value: stats.loading ? '...' : String(stats.subjects), icon: 'Layers', color: 'accent' },
    { title: 'Questions', value: stats.loading ? '...' : String(stats.questions), icon: 'FileText', color: 'success' },
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
      'add-student': '/student-management',
      'create-course': '/course-management',
      'create-test': '/question-bank',
    };
    if (actionId === 'show-student-modal') {
      setShowStudentModal(true);
      return;
    }
    if (actionRoutes?.[actionId]) {
      navigate(actionRoutes?.[actionId]);
    }
  };

  const handleLogout = () => {
    navigate('/login');
  };

  const handleUserCreated = (userData) => {
    setNotification({
      show: true,
      message: `Student "${userData?.firstName}" created successfully!`,
      type: 'success'
    });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
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
                icon={stat?.icon}
                color={stat?.color}
              />
            ))}
          </div>

          {/* Teacher Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Question Bank Card */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Question Bank</h3>
                  <p className="text-sm text-muted-foreground">Create and manage questions</p>
                </div>
                <Icon name="FileText" size={24} className="text-accent" />
              </div>
              <Button onClick={() => navigate('/question-bank')} className="w-full" variant="outline">
                <Icon name="Plus" size={16} />
                Open Question Bank
              </Button>
            </div>

            {/* Add Student Card */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Add Student</h3>
                  <p className="text-sm text-muted-foreground">Enroll new students</p>
                </div>
                <Icon name="User" size={24} className="text-blue-600" />
              </div>
              <Button onClick={() => setShowStudentModal(true)} className="w-full" variant="outline">
                <Icon name="Plus" size={16} />
                Add Student
              </Button>
            </div>

            {/* Manage Courses Card */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Courses</h3>
                  <p className="text-sm text-muted-foreground">Manage academic structure</p>
                </div>
                <Icon name="BookOpen" size={24} className="text-success" />
              </div>
              <Button onClick={() => navigate('/course-management')} className="w-full" variant="outline">
                <Icon name="Eye" size={16} />
                Manage Courses
              </Button>
            </div>
          </div>

          {/* Courses list */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Your Courses</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/course-management')}>
                  View All
                  <Icon name="ArrowRight" size={14} className="ml-1" />
                </Button>
              </div>
              <div className="space-y-3">
                {stats.loading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : courses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No courses found for this institute.</p>
                ) : (
                  courses.slice(0, 5).map((course) => (
                    <div key={course.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                      <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center">
                        <Icon name="BookOpen" size={14} className="text-secondary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{course.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {course.code}{course.level ? ` • ${course.level}` : ''}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Quick Links</h3>
              </div>
              <div className="space-y-3">
                <button onClick={() => navigate('/question-bank')} className="w-full flex items-center space-x-3 p-2 hover:bg-muted/50 rounded text-left">
                  <Icon name="FileText" size={16} className="text-accent" />
                  <span className="text-sm text-foreground">Manage Question Bank</span>
                </button>
                <button onClick={() => navigate('/student-management')} className="w-full flex items-center space-x-3 p-2 hover:bg-muted/50 rounded text-left">
                  <Icon name="Users" size={16} className="text-primary" />
                  <span className="text-sm text-foreground">Manage Students</span>
                </button>
                <button onClick={() => navigate('/profile')} className="w-full flex items-center space-x-3 p-2 hover:bg-muted/50 rounded text-left">
                  <Icon name="User" size={16} className="text-blue-600" />
                  <span className="text-sm text-foreground">My Profile</span>
                </button>
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
          <Icon name={notification.type === 'success' ? 'CheckCircle' : 'XCircle'} size={20} />
          {notification.message}
          <button
            onClick={() => setNotification({ show: false, message: '', type: 'success' })}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '8px', fontSize: '18px' }}
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
