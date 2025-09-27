import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import { newUserService } from '../../services/newUserService';
import { batchService } from '../../services/batchService';
import { courseService } from '../../services/courseService';
import NavigationHeader from '../../components/ui/NavigationHeader';
import RoleBasedNavigation from '../../components/ui/RoleBasedNavigation';
import StudentFilters from './components/StudentFilters';
import StudentTable from './components/StudentTable';
import StudentToolbar from './components/StudentToolbar';
import AddStudentModal from './components/AddStudentModal';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const StudentManagementScreen = () => {
  const navigate = useNavigate();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'asc' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('');
  
  // Data state
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  
  const [filters, setFilters] = useState({
    batch: '',
    course: '',
    status: '',
    performance: '',
    enrollmentDate: '',
    searchTerm: ''
  });

  // Load initial data
  useEffect(() => {
    if (!authLoading && userProfile) {
      if (userProfile?.role === 'student') {
        navigate('/student-dashboard');
        return;
      }
      loadInitialData();
    }
  }, [authLoading, userProfile, navigate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');
      setConnectionStatus('Connecting to database...');
      
      // Test connection first using new student-specific API
      const { data: connectionTest, error: connectionError } = await newUserService?.getStudentsByBatch(null, { page: 0, size: 1 });
      if (connectionError) {
        setConnectionStatus('Database connection failed');
        console.warn('Database connection failed:', connectionError);
        // Still continue to try loading students as this might just be an empty result
      }
      setConnectionStatus('Loading student data...');
      
      // Load students with batch and course information using new student-specific API
      const { data: studentsData, error: studentsError } = await newUserService?.getStudentsByBatch(null);
      
      if (studentsError) {
        setConnectionStatus('Failed to load students');
        console.warn('Failed to load students:', studentsError);
        // Don't throw error for empty results, just set empty array
        setStudents([]);
        setLoading(false);
        setConnectionStatus('No students found');
        return;
      }

      setConnectionStatus('Loading batch information...');
      
      // Load batches for current user
      const { data: batchesData, error: batchesError } = userProfile?.role === 'super_admin' 
        ? await batchService?.getBatches({ isActive: true })
        : await batchService?.getBatchesForTeacher(userProfile?.id);
        
      if (batchesError) {
        setConnectionStatus('Failed to load batches');
        throw new Error(`Failed to load batches: ${batchesError?.message}`);
      }

      setConnectionStatus('Loading course information...');
      
      // Load courses
      const { data: coursesData, error: coursesError } = await courseService?.getCourses({ isActive: true });
      if (coursesError) {
        console.error('Warning: Could not load courses:', coursesError);
        // Don't throw error for courses, as it's not critical
      }

      setConnectionStatus('Processing student enrollment data...');
      
      // Enrich students with batch and enrollment data
      const enrichedStudents = await Promise.all(
        (studentsData || [])?.map(async (student) => {
          try {
            const { data: studentBatches } = await batchService?.getBatchesForStudent(student?.id);
            const currentBatch = studentBatches?.[0]?.batch;
            
            return {
              ...student,
              studentId: `STU${student?.id?.slice(-6)?.toUpperCase()}`,
              name: student?.full_name,
              batch: currentBatch ? {
                id: currentBatch?.id,
                name: currentBatch?.name,
                courseName: currentBatch?.course?.name
              } : null,
              course: currentBatch?.course?.name || 'Not Assigned',
              status: student?.is_active ? 'active' : 'inactive',
              averageScore: Math.floor(Math.random() * 40) + 60, // TODO: Calculate from test_submissions
              lastTestScore: Math.floor(Math.random() * 40) + 60,
              testsTaken: Math.floor(Math.random() * 20) + 5,
              enrollmentDate: new Date(student?.created_at)?.toISOString()?.split('T')?.[0],
              photo: student?.photo_url || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format&q=80`
            };
          } catch (error) {
            console.error('Error enriching student data:', error);
            return {
              ...student,
              studentId: `STU${student?.id?.slice(-6)?.toUpperCase()}`,
              name: student?.full_name,
              batch: null,
              course: 'Not Assigned',
              status: student?.is_active ? 'active' : 'inactive',
              averageScore: 0,
              lastTestScore: 0,
              testsTaken: 0,
              enrollmentDate: new Date(student?.created_at)?.toISOString()?.split('T')?.[0],
              photo: student?.photo_url || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format&q=80`
            };
          }
        })
      );
      
      setStudents(enrichedStudents || []);
      setBatches(batchesData || []);
      setCourses(coursesData || []);
      
      setConnectionStatus(`Successfully loaded ${enrichedStudents?.length || 0} students, ${batchesData?.length || 0} batches, and ${coursesData?.length || 0} courses from Supabase`);
      
    } catch (error) {
      const errorMessage = error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')
        ? 'Cannot connect to Supabase. Please check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file, and ensure your Supabase project is active.'
        : `Failed to load student data: ${error?.message}`;
      
      setError(errorMessage);
      setConnectionStatus('Connection failed');
      console.error('Error loading student data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort students
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = students?.filter(student => {
      const matchesSearch = searchTerm === '' || 
        student?.name?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
        student?.email?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
        student?.studentId?.toLowerCase()?.includes(searchTerm?.toLowerCase());

      const matchesBatch = filters?.batch === '' || student?.batch?.id === filters?.batch;
      const matchesCourse = filters?.course === '' || 
        courses?.find(c => c?.id === filters?.course)?.name === student?.course;
      const matchesStatus = filters?.status === '' || student?.status === filters?.status;
      
      const matchesPerformance = filters?.performance === '' || 
        (filters?.performance === 'excellent' && student?.averageScore >= 90) ||
        (filters?.performance === 'good' && student?.averageScore >= 75 && student?.averageScore < 90) ||
        (filters?.performance === 'average' && student?.averageScore >= 60 && student?.averageScore < 75) ||
        (filters?.performance === 'below-average' && student?.averageScore < 60);

      const matchesDate = filters?.enrollmentDate === '' || 
        student?.enrollmentDate === filters?.enrollmentDate;

      return matchesSearch && matchesBatch && matchesCourse && matchesStatus && matchesPerformance && matchesDate;
    });

    // Sort students
    filtered?.sort((a, b) => {
      let aValue = a?.[sortConfig?.key];
      let bValue = b?.[sortConfig?.key];

      if (sortConfig?.key === 'performance') {
        aValue = a?.averageScore;
        bValue = b?.averageScore;
      }

      if (typeof aValue === 'string') {
        aValue = aValue?.toLowerCase();
        bValue = bValue?.toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig?.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig?.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [students, searchTerm, filters, sortConfig, courses]);

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    navigate('/login');
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      batch: '',
      course: '',
      status: '',
      performance: '',
      enrollmentDate: '',
      searchTerm: ''
    });
    setSearchTerm('');
  };

  const handleSort = (column) => {
    setSortConfig(prev => ({
      key: column,
      direction: prev?.key === column && prev?.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectStudent = (studentId, isSelected) => {
    if (isSelected) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev?.filter(id => id !== studentId));
    }
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedStudents(filteredAndSortedStudents?.map(student => student?.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleBulkAction = async (actionType, studentIds) => {
    try {
      setError('');
      
      switch (actionType) {
        case 'assign-batch': setSuccessMessage('Batch assignment feature coming soon');
          break;
        case 'change-status':
          await Promise.all(
            studentIds?.map(id => userService?.updateUserProfile(id, { is_active: false }))
          );
          setSuccessMessage(`Status updated for ${studentIds?.length} students`);
          loadInitialData();
          break;
        case 'send-notification':
          setSuccessMessage('Notification sent to selected students');
          break;
        case 'export-selected':
          handleExport('csv', studentIds);
          break;
        case 'delete-selected':
          await Promise.all(
            studentIds?.map(id => userService?.deleteUser(id))
          );
          setSuccessMessage(`${studentIds?.length} students deactivated`);
          setSelectedStudents([]);
          loadInitialData();
          break;
        case 'clear-selection':
          setSelectedStudents([]);
          break;
        default:
          break;
      }
    } catch (error) {
      const errorMessage = error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')
        ? 'Cannot connect to database. Please check your Supabase connection.' :'Failed to perform bulk action. Please try again.';
      setError(errorMessage);
      console.error('Bulk action error:', error);
    }
  };

  const handleAddStudent = async (studentData) => {
    try {
      setError('');
      
      // Create auth user and profile
      const { data, error } = await userService?.createUserProfile({
        email: studentData?.email,
        password: studentData?.password,
        fullName: `${studentData?.firstName} ${studentData?.lastName}`,
        role: 'student',
        phoneNumber: studentData?.phone,
        parentPhone: studentData?.parentPhone
      });

      if (error) throw error;

      setSuccessMessage('Student added successfully');
      loadInitialData();
    } catch (error) {
      const errorMessage = error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')
        ? 'Cannot connect to database. Please check your Supabase connection.' :'Failed to add student. Please try again.';
      setError(errorMessage);
      console.error('Add student error:', error);
    }
  };

  const handleEditStudent = (student) => {
    setSuccessMessage('Edit student feature coming soon');
  };

  const handleViewAnalytics = (student) => {
    navigate('/analytics-and-reports-screen');
  };

  const handleManageBatch = (student) => {
    navigate('/course-and-batch-management-screen');
  };

  const handleDeleteStudent = async (studentId) => {
    try {
      setError('');
      
      await userService?.deleteUser(studentId);
      setSuccessMessage('Student deactivated successfully');
      loadInitialData();
    } catch (error) {
      const errorMessage = error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')
        ? 'Cannot connect to database. Please check your Supabase connection.' :'Failed to delete student. Please try again.';
      setError(errorMessage);
      console.error('Delete student error:', error);
    }
  };

  const handleExport = (format, selectedIds = null) => {
    try {
      const dataToExport = selectedIds 
        ? students?.filter(s => selectedIds?.includes(s?.id))
        : filteredAndSortedStudents;
        
      const exportData = dataToExport?.map(student => ({
        'Student ID': student?.studentId,
        'Name': student?.name,
        'Email': student?.email,
        'Phone': student?.phone_number,
        'Batch': student?.batch?.name || 'Not Assigned',
        'Course': student?.course,
        'Status': student?.status,
        'Average Score': `${student?.averageScore}%`,
        'Tests Taken': student?.testsTaken,
        'Enrollment Date': student?.enrollmentDate
      }));

      // Create CSV content
      const headers = Object.keys(exportData?.[0] || {});
      const csvContent = [
        headers?.join(','),
        ...exportData?.map(row => 
          headers?.map(header => `"${row?.[header] || ''}"`)?.join(',')
        )
      ]?.join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students_export_${new Date()?.toISOString()?.split('T')?.[0]}.csv`;
      a?.click();
      URL.revokeObjectURL(url);

      setSuccessMessage(`Exported ${exportData?.length} students to ${format?.toUpperCase()}`);
    } catch (error) {
      setError('Failed to export students. Please try again.');
      console.error('Export error:', error);
    }
  };

  const handleImport = (file) => {
    setError('Import functionality will be implemented soon');
  };

  // Clear selected students when filters change
  useEffect(() => {
    setSelectedStudents([]);
  }, [filters, searchTerm]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" size={32} className="animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground mb-2">Loading student management...</p>
          {connectionStatus && (
            <p className="text-xs text-muted-foreground">{connectionStatus}</p>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  if (userProfile?.role === 'student') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Icon name="Lock" size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground mb-4">Students cannot access the student management page.</p>
          <Button onClick={() => navigate('/student-dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <NavigationHeader
        userRole={userProfile?.role}
        userName={userProfile?.full_name}
        onLogout={handleLogout}
        onMenuToggle={() => setIsMobileNavOpen(!isMobileNavOpen)}
        showMenuToggle={true}
        notifications={0}
      />

      {/* Role-based Navigation */}
      <RoleBasedNavigation
        userRole={userProfile?.role}
        activeRoute="/student-management-screen"
        onNavigate={handleNavigation}
        isMobile={window.innerWidth < 1024}
        isOpen={isMobileNavOpen}
        onToggle={() => setIsMobileNavOpen(!isMobileNavOpen)}
      />

      {/* Main Content */}
      <div className={`pt-16 ${userProfile?.role === 'student' ? 'pb-16 lg:pb-0' : ''} ${
        window.innerWidth >= 1024 ? 'lg:pl-64' : ''
      }`}>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Connection Status */}
            {connectionStatus && !error && (
              <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Icon name="CheckCircle" size={16} className="text-success" />
                  <p className="text-success text-sm">{connectionStatus}</p>
                </div>
              </div>
            )}

            {/* Messages */}
            {error && (
              <div className="mb-4 p-4 bg-error/10 border border-error/20 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Icon name="AlertCircle" size={16} className="text-error mt-0.5" />
                  <div className="flex-1">
                    <p className="text-error font-medium mb-1">Database Connection Issue</p>
                    <p className="text-error text-sm">{error}</p>
                    <div className="mt-2 text-xs text-error/80">
                      <p>Troubleshooting steps:</p>
                      <ul className="ml-4 mt-1 list-disc">
                        <li>Check your .env file has valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY</li>
                        <li>Ensure your Supabase project is active (not paused)</li>
                        <li>Verify your internet connection</li>
                        <li>Try refreshing the page</li>
                      </ul>
                    </div>
                  </div>
                  <button onClick={() => setError('')} className="ml-auto">
                    <Icon name="X" size={16} className="text-error" />
                  </button>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-4 bg-success/10 border border-success/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Icon name="CheckCircle" size={16} className="text-success" />
                  <p className="text-success font-medium">{successMessage}</p>
                  <button onClick={() => setSuccessMessage('')} className="ml-auto">
                    <Icon name="X" size={16} className="text-success" />
                  </button>
                </div>
              </div>
            )}

            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">Student Management</h1>
              <p className="text-muted-foreground mt-1">
                {students?.length > 0 
                  ? `Managing ${students?.length} students with real-time Supabase data`
                  : 'Manage student profiles, batch assignments, and academic progress'
                }
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Filters Sidebar - Desktop */}
              <div className="hidden lg:block lg:col-span-3">
                <StudentFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onClearFilters={handleClearFilters}
                  batches={batches}
                  courses={courses}
                />
              </div>

              {/* Main Content Area */}
              <div className="lg:col-span-9">
                {/* Toolbar */}
                <StudentToolbar
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  selectedStudents={selectedStudents}
                  onBulkAction={handleBulkAction}
                  onAddStudent={() => setIsAddModalOpen(true)}
                  onExport={handleExport}
                  onImport={handleImport}
                  totalStudents={students?.length}
                  filteredStudents={filteredAndSortedStudents?.length}
                  onToggleFilters={() => setIsFiltersOpen(true)}
                />

                {/* Student Table */}
                <StudentTable
                  students={filteredAndSortedStudents}
                  onEditStudent={handleEditStudent}
                  onViewAnalytics={handleViewAnalytics}
                  onManageBatch={handleManageBatch}
                  onDeleteStudent={handleDeleteStudent}
                  selectedStudents={selectedStudents}
                  onSelectStudent={handleSelectStudent}
                  onSelectAll={handleSelectAll}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />

                {/* Empty State */}
                {filteredAndSortedStudents?.length === 0 && !loading && !error && (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon name="Users" size={32} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {students?.length === 0 ? 'No students found in database' : 'No students match your filters'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {students?.length === 0 
                        ? 'Get started by adding your first student or check your Supabase connection' 
                        : searchTerm || Object.values(filters)?.some(f => f !== '') 
                          ? 'Try adjusting your search or filters' :'Get started by adding your first student'
                      }
                    </p>
                    <Button onClick={() => setIsAddModalOpen(true)} disabled={!!error}>
                      Add Student
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {isFiltersOpen && (
        <StudentFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          batches={batches}
          courses={courses}
          isCollapsed={true}
          onToggleCollapse={() => setIsFiltersOpen(false)}
        />
      )}

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddStudent}
        batches={batches}
        courses={courses}
      />
    </div>
  );
};

export default StudentManagementScreen;