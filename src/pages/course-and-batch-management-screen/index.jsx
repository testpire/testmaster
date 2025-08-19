import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NavigationHeader from '../../components/ui/NavigationHeader';
import RoleBasedNavigation from '../../components/ui/RoleBasedNavigation';
import QuickActionPanel from '../../components/ui/QuickActionPanel';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

// Import components
import CourseCard from './components/CourseCard';
import BatchTable from './components/BatchTable';
import CourseCreationModal from './components/CourseCreationModal';
import BatchCreationModal from './components/BatchCreationModal';
import SearchAndFilters from './components/SearchAndFilters';
import StudentMoveModal from './components/StudentMoveModal';

const CourseAndBatchManagementScreen = () => {
  const navigate = useNavigate();
  const { user, userProfile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('courses');
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  
  // Modal states
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showStudentMoveModal, setShowStudentMoveModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);
  const [selectedBatchForMove, setSelectedBatchForMove] = useState(null);

  // Data states
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredBatches, setFilteredBatches] = useState([]);

  // Mock data (will be replaced with Supabase data)
  const mockCourses = [
    {
      id: 'C001',
      name: 'JEE Main Physics & Chemistry',
      description: 'Comprehensive course covering JEE Main syllabus for Physics and Chemistry',
      subjects: ['Physics', 'Chemistry'],
      difficultyLevel: 'Tough',
      curriculum: 'JEE',
      duration: '12 months',
      maxStudents: 50,
      enrolledStudents: 42,
      assignedTeachers: 2,
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: 'C002',
      name: 'NEET Biology Complete',
      description: 'Complete Biology preparation for NEET aspirants',
      subjects: ['Biology'],
      difficultyLevel: 'Moderate',
      curriculum: 'NEET',
      duration: '10 months',
      maxStudents: 40,
      enrolledStudents: 35,
      assignedTeachers: 1,
      createdAt: '2024-02-01T09:00:00Z'
    },
    {
      id: 'C003',
      name: 'CBSE Class 12 Mathematics',
      description: 'Advanced Mathematics for CBSE Class 12 students',
      subjects: ['Mathematics'],
      difficultyLevel: 'Moderate',
      curriculum: 'CBSE',
      duration: '8 months',
      maxStudents: 30,
      enrolledStudents: 28,
      assignedTeachers: 1,
      createdAt: '2024-01-20T11:00:00Z'
    },
    {
      id: 'C004',
      name: 'Foundation Science',
      description: 'Basic science concepts for Class 11 students',
      subjects: ['Physics', 'Chemistry', 'Biology'],
      difficultyLevel: 'Easy',
      curriculum: 'CBSE',
      duration: '6 months',
      maxStudents: 45,
      enrolledStudents: 38,
      assignedTeachers: 3,
      createdAt: '2024-02-10T08:00:00Z'
    }
  ];

  const mockBatches = [
    {
      id: 'B001',
      name: 'JEE Main Morning Batch',
      batchId: 'JEE-M-001',
      courseId: 'C001',
      courseName: 'JEE Main Physics & Chemistry',
      teacherName: 'Dr. Rajesh Kumar',
      teacherId: 'T001',
      maxStudents: 30,
      currentStudents: 28,
      schedule: 'Mon-Fri 9:00-12:00',
      status: 'Active',
      startDate: '2024-01-15',
      endDate: '2024-12-15',
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: 'B002',
      name: 'NEET Biology Evening',
      batchId: 'NEET-B-001',
      courseId: 'C002',
      courseName: 'NEET Biology Complete',
      teacherName: 'Dr. Priya Sharma',
      teacherId: 'T002',
      maxStudents: 25,
      currentStudents: 22,
      schedule: 'Mon-Fri 15:00-18:00',
      status: 'Active',
      startDate: '2024-02-01',
      endDate: '2024-11-30',
      createdAt: '2024-02-01T09:00:00Z'
    }
  ];

  const mockTeachers = [
    {
      id: 'T001',
      name: 'Dr. Rajesh Kumar',
      subjects: ['Physics', 'Chemistry'],
      experience: '12 years'
    },
    {
      id: 'T002',
      name: 'Dr. Priya Sharma',
      subjects: ['Biology'],
      experience: '8 years'
    },
    {
      id: 'T003',
      name: 'Prof. Amit Singh',
      subjects: ['Mathematics'],
      experience: '15 years'
    }
  ];

  // Initialize data
  useEffect(() => {
    setCourses(mockCourses);
    setBatches(mockBatches);
    setFilteredCourses(mockCourses);
    setFilteredBatches(mockBatches);
  }, []);

  // Check authentication status
  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login if not authenticated
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Icon name="Loader2" size={24} className="animate-spin" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  // Get user role - fallback to super-admin for demo
  const currentUserRole = userProfile?.role || 'super-admin';
  const displayName = user?.user_metadata?.full_name || userProfile?.full_name || 'Admin User';

  // Navigation handlers
  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    navigate('/login-screen');
  };

  const handleQuickAction = (actionId) => {
    switch (actionId) {
      case 'create-course':
        setEditingCourse(null);
        setShowCourseModal(true);
        break;
      case 'create-batch':
        setEditingBatch(null);
        setShowBatchModal(true);
        break;
      case 'view-analytics': navigate('/analytics-and-reports-screen');
        break;
      case 'system-settings':
        // Handle settings
        break;
      default:
        break;
    }
  };

  // Search and filter handlers
  const handleSearch = (query) => {
    if (activeTab === 'courses') {
      let filtered = courses?.filter(course =>
        course?.name?.toLowerCase()?.includes(query?.toLowerCase()) ||
        course?.subjects?.some(subject => subject?.toLowerCase()?.includes(query?.toLowerCase())) ||
        course?.curriculum?.toLowerCase()?.includes(query?.toLowerCase())
      );
      setFilteredCourses(filtered);
    } else {
      let filtered = batches?.filter(batch =>
        batch?.name?.toLowerCase()?.includes(query?.toLowerCase()) ||
        batch?.batchId?.toLowerCase()?.includes(query?.toLowerCase()) ||
        batch?.teacherName?.toLowerCase()?.includes(query?.toLowerCase())
      );
      setFilteredBatches(filtered);
    }
  };

  const handleFilter = (filters) => {
    if (activeTab === 'courses') {
      let filtered = courses;
      
      if (filters?.curriculum) {
        filtered = filtered?.filter(course => course?.curriculum === filters?.curriculum);
      }
      if (filters?.difficulty) {
        filtered = filtered?.filter(course => course?.difficultyLevel === filters?.difficulty);
      }
      if (filters?.subject) {
        filtered = filtered?.filter(course => course?.subjects?.includes(filters?.subject));
      }
      
      setFilteredCourses(filtered);
    } else {
      let filtered = batches;
      
      if (filters?.status) {
        filtered = filtered?.filter(batch => batch?.status === filters?.status);
      }
      if (filters?.teacher) {
        filtered = filtered?.filter(batch => batch?.teacherName === filters?.teacher);
      }
      
      setFilteredBatches(filtered);
    }
  };

  // Course handlers
  const handleCreateCourse = () => {
    setEditingCourse(null);
    setShowCourseModal(true);
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setShowCourseModal(true);
  };

  const handleSaveCourse = (courseData) => {
    if (editingCourse) {
      const updatedCourses = courses?.map(course =>
        course?.id === editingCourse?.id ? courseData : course
      );
      setCourses(updatedCourses);
      setFilteredCourses(updatedCourses);
    } else {
      const newCourses = [...courses, courseData];
      setCourses(newCourses);
      setFilteredCourses(newCourses);
    }
    setShowCourseModal(false);
    setEditingCourse(null);
  };

  const handleDeleteCourse = (course) => {
    if (window.confirm(`Are you sure you want to delete "${course?.name}"?`)) {
      const updatedCourses = courses?.filter(c => c?.id !== course?.id);
      setCourses(updatedCourses);
      setFilteredCourses(updatedCourses);
    }
  };

  const handleViewCourseStudents = (course) => {
    navigate('/student-management-screen', { state: { courseFilter: course?.id } });
  };

  const handleManageCourseContent = (course) => {
    navigate('/test-creation-screen', { state: { courseId: course?.id } });
  };

  // Batch handlers
  const handleCreateBatch = () => {
    setEditingBatch(null);
    setShowBatchModal(true);
  };

  const handleEditBatch = (batch) => {
    setEditingBatch(batch);
    setShowBatchModal(true);
  };

  const handleSaveBatch = (batchData) => {
    if (editingBatch) {
      const updatedBatches = batches?.map(batch =>
        batch?.id === editingBatch?.id ? batchData : batch
      );
      setBatches(updatedBatches);
      setFilteredBatches(updatedBatches);
    } else {
      const newBatches = [...batches, batchData];
      setBatches(newBatches);
      setFilteredBatches(newBatches);
    }
    setShowBatchModal(false);
    setEditingBatch(null);
  };

  const handleDeleteBatch = (batch) => {
    if (window.confirm(`Are you sure you want to delete "${batch?.name}"?`)) {
      const updatedBatches = batches?.filter(b => b?.id !== batch?.id);
      setBatches(updatedBatches);
      setFilteredBatches(updatedBatches);
    }
  };

  const handleViewBatchStudents = (batch) => {
    navigate('/student-management-screen', { state: { batchFilter: batch?.id } });
  };

  const handleMoveStudents = (batch) => {
    setSelectedBatchForMove(batch);
    setShowStudentMoveModal(true);
  };

  const handleStudentMove = (moveData) => {
    // Update batch student counts
    const updatedBatches = batches?.map(batch => {
      if (batch?.id === moveData?.sourceBatch?.id) {
        return {
          ...batch,
          currentStudents: batch?.currentStudents - moveData?.students?.length
        };
      }
      if (batch?.id === moveData?.targetBatch?.id) {
        return {
          ...batch,
          currentStudents: batch?.currentStudents + moveData?.students?.length
        };
      }
      return batch;
    });
    
    setBatches(updatedBatches);
    setFilteredBatches(updatedBatches);
    setShowStudentMoveModal(false);
    setSelectedBatchForMove(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <NavigationHeader
        userRole={currentUserRole}
        userName={displayName}
        onMenuToggle={() => setIsMobileNavOpen(!isMobileNavOpen)}
        showMenuToggle={true}
        notifications={3}
      />
      
      {/* Role-based Navigation */}
      <RoleBasedNavigation
        userRole={currentUserRole}
        activeRoute="/course-and-batch-management-screen"
        onNavigate={handleNavigation}
        isCollapsed={isNavCollapsed}
        isMobile={window.innerWidth < 1024}
        isOpen={isMobileNavOpen}
        onToggle={() => setIsMobileNavOpen(!isMobileNavOpen)}
      />
      
      {/* Main Content */}
      <div className={`transition-all duration-300 ${
        window.innerWidth >= 1024 ? (isNavCollapsed ? 'ml-16' : 'ml-64') : 'ml-0'
      } pt-16`}>
        <div className="p-6">
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Course & Batch Management</h1>
              <p className="text-muted-foreground">
                Create and manage courses, organize student batches, and assign teachers
              </p>
            </div>
            
            <div className="flex items-center space-x-3 mt-4 lg:mt-0">
              <Button variant="outline" onClick={() => setIsNavCollapsed(!isNavCollapsed)}>
                <Icon name={isNavCollapsed ? "PanelLeftOpen" : "PanelLeftClose"} size={16} />
                <span className="ml-2 hidden sm:inline">
                  {isNavCollapsed ? 'Expand' : 'Collapse'}
                </span>
              </Button>
              
              <Button 
                onClick={activeTab === 'courses' ? handleCreateCourse : handleCreateBatch}
              >
                <Icon name="Plus" size={16} />
                <span className="ml-2">
                  Create {activeTab === 'courses' ? 'Course' : 'Batch'}
                </span>
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('courses')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'courses' ?'bg-card text-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon name="BookOpen" size={16} className="inline mr-2" />
              Courses ({filteredCourses?.length})
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'batches' ?'bg-card text-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon name="Users" size={16} className="inline mr-2" />
              Batches ({filteredBatches?.length})
            </button>
          </div>

          {/* Search and Filters */}
          <SearchAndFilters
            onSearch={handleSearch}
            onFilter={handleFilter}
            activeTab={activeTab}
            totalCourses={filteredCourses?.length}
            totalBatches={filteredBatches?.length}
          />

          {/* Content Area */}
          {activeTab === 'courses' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses?.map(course => (
                <CourseCard
                  key={course?.id}
                  course={course}
                  onEdit={handleEditCourse}
                  onViewStudents={handleViewCourseStudents}
                  onManageContent={handleManageCourseContent}
                  onDelete={handleDeleteCourse}
                />
              ))}
              
              {filteredCourses?.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Icon name="BookOpen" size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No courses found</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first course to get started with batch management.
                  </p>
                  <Button onClick={handleCreateCourse}>
                    <Icon name="Plus" size={16} />
                    <span className="ml-2">Create Course</span>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <BatchTable
                batches={filteredBatches}
                onEdit={handleEditBatch}
                onViewStudents={handleViewBatchStudents}
                onDelete={handleDeleteBatch}
                onMoveStudents={handleMoveStudents}
              />
              
              {filteredBatches?.length === 0 && (
                <div className="text-center py-12">
                  <Icon name="Users" size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No batches found</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first batch to organize students and assign teachers.
                  </p>
                  <Button onClick={handleCreateBatch}>
                    <Icon name="Plus" size={16} />
                    <span className="ml-2">Create Batch</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Action Panel */}
      <QuickActionPanel
        userRole={currentUserRole}
        onAction={handleQuickAction}
        variant="floating"
      />
      
      {/* Modals */}
      <CourseCreationModal
        isOpen={showCourseModal}
        onClose={() => {
          setShowCourseModal(false);
          setEditingCourse(null);
        }}
        onSave={handleSaveCourse}
        editingCourse={editingCourse}
      />
      <BatchCreationModal
        isOpen={showBatchModal}
        onClose={() => {
          setShowBatchModal(false);
          setEditingBatch(null);
        }}
        onSave={handleSaveBatch}
        editingBatch={editingBatch}
        availableCourses={courses}
        availableTeachers={mockTeachers}
      />
      <StudentMoveModal
        isOpen={showStudentMoveModal}
        onClose={() => {
          setShowStudentMoveModal(false);
          setSelectedBatchForMove(null);
        }}
        sourceBatch={selectedBatchForMove}
        availableBatches={batches}
        onMoveStudents={handleStudentMove}
      />
    </div>
  );
};

export default CourseAndBatchManagementScreen;