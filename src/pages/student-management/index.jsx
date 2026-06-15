import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import { newUserService } from '../../services/newUserService';
import { newInstituteService } from '../../services/newInstituteService';
import { courseService } from '../../services/courseService';
import { newBatchService } from '../../services/newBatchService';
import PageLayout from '../../components/layout/PageLayout';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Icon from '../../components/AppIcon';
import InfiniteScrollSentinel from '../../components/ui/InfiniteScrollSentinel';
import CreateUserModal from '../super-admin-dashboard/components/CreateUserModal';

const StudentManagement = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  // Try to get SuperAdmin context for institute-change refetch
  let superAdminContext = null;
  try {
    superAdminContext = useSuperAdmin();
  } catch (e) {
    // Not in super-admin context
  }

  // Student management states
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 0, hasMore: false });
  const loadingMoreRef = useRef(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Course / batch filter state
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Institute data for filtering
  const [instituteData, setInstituteData] = useState({
    institute: null,
    loading: true,
    error: null
  });

  // Get current user info
  const currentUser = {
    name: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Admin',
    firstName: userProfile?.firstName || user?.firstName || 'Admin',
    role: userProfile?.role?.toLowerCase()?.replace('_', '-') || 'inst-admin',
    email: userProfile?.email || user?.email,
    avatar: userProfile?.avatar || null,
    notifications: 0,
    instituteId: userProfile?.instituteId || user?.instituteId
  };

  // Stable load keys: user/userProfile settle in separate renders, so depending on
  // both would double-fire every load below. Use the auth user id instead.
  const authUserId = (userProfile || user)?.id ?? null;
  const selectedInstituteId = superAdminContext?.selectedInstitute?.id ?? null;

  // Load institute data + course list on mount, and reload when a super-admin switches
  // institute (courses/batches/students all change, so the filters reset too — a no-op
  // on the initial mount when they're already empty).
  useEffect(() => {
    if (!authUserId) {
      setLoading(true);
      setError('Loading user information...');
      return;
    }
    setSelectedCourseId('');
    setSelectedBatchId('');
    setBatches([]);
    loadInstituteData();
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, selectedInstituteId]);

  // Load the batches for the selected course (course → many batches). Clearing the
  // course resets the batch filter too.
  useEffect(() => {
    if (!selectedCourseId) {
      setBatches([]);
      setSelectedBatchId('');
      return;
    }
    loadBatches(selectedCourseId);
  }, [selectedCourseId]);

  // (Re)load students whenever auth, the active institute, or the filters change.
  useEffect(() => {
    if (!authUserId) return;
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, selectedInstituteId, selectedCourseId, selectedBatchId]);

  const loadInstituteData = async () => {
    // Super-admins operate on the switcher-selected institute (shown via
    // selectedInstitute), not their profile's home institute — fetching that one
    // 403s ("you may only access your own institute"). Only fixed-institute roles fetch.
    if (currentUser.role === 'super-admin' || !currentUser.instituteId) return;

    try {
      const { data, error } = await newInstituteService.getInstituteById(currentUser.instituteId, { skipAuthRedirect: true });
      
      if (error) {
        setInstituteData(prev => ({ ...prev, error, loading: false }));
        return;
      }

      setInstituteData({
        institute: data,
        loading: false,
        error: null
      });
    } catch (err) {
      console.error('Error loading institute data:', err);
      setInstituteData(prev => ({ ...prev, error: err.message, loading: false }));
    }
  };

  const loadCourses = async () => {
    setCoursesLoading(true);
    try {
      const { data } = await courseService.getCourses({ page: 0, size: 100 });
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading courses:', err);
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  const loadBatches = async (courseId) => {
    setBatchesLoading(true);
    try {
      const { data } = await newBatchService.getBatchesByCourse(courseId);
      setBatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading batches:', err);
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  };

  // Load a page of students. page 0 replaces the list (fresh load / filter change);
  // higher pages append (infinite scroll). Course/batch filtering and institute
  // scoping are applied server-side via StudentCriteriaDto + the JWT / header.
  const loadStudents = async (page = 0) => {
    if (page === 0) {
      setLoading(true);
      setError(null);
    }

    try {
      const { data, pagination: pg, error } = await newUserService.searchStudents(
        {
          courseId: selectedCourseId || null,
          batchId: selectedBatchId || null,
        },
        { page, size: 20 }
      );

      if (error) {
        if (page === 0) {
          setError(typeof error === 'string' ? error : error.message || 'Failed to load students');
          setStudents([]);
        }
        return;
      }

      const list = Array.isArray(data) ? data : [];
      setStudents((prev) => (page === 0 ? list : [...prev, ...list]));
      setPagination({ currentPage: pg?.currentPage ?? page, hasMore: !!pg?.hasMore });
    } catch (err) {
      console.error('Error loading students:', err);
      if (page === 0) {
        setError('Failed to load students: ' + err.message);
        setStudents([]);
      }
    } finally {
      if (page === 0) setLoading(false);
    }
  };

  // Fetch and append the next page (infinite scroll). loadingMoreRef guards against
  // a burst of sentinel triggers firing overlapping fetches.
  const loadMoreStudents = async () => {
    if (loading || loadingMoreRef.current || !pagination.hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      await loadStudents(pagination.currentPage + 1);
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };



  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    loadStudents(); // Reload the list
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setEditingStudent(null);
    loadStudents(); // Reload the list
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setShowEditModal(true);
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await newUserService.deleteUser(studentId);
      
      if (error) {
        alert('Failed to delete student: ' + error);
        return;
      }

      loadStudents(); // Reload the list
    } catch (err) {
      console.error('Error deleting student:', err);
      alert('Failed to delete student');
    }
  };

  // Institute shown in the header. For super-admin, follow the institute switcher
  // (selectedInstitute) so it updates on switch; otherwise use the user's own institute.
  const displayInstitute = currentUser.role === 'super-admin'
    ? superAdminContext?.selectedInstitute
    : instituteData.institute;

  // Dropdown options for the course/batch filters.
  const courseOptions = courses.map((c) => ({
    value: c.id,
    label: c.name || c.code || `Course #${c.id}`,
  }));
  const batchOptions = batches.map((b) => ({
    value: b.id,
    label: b.name || b.code || `Batch #${b.id}`,
  }));

  // True when any narrowing is active (search box or course/batch filters).
  const hasActiveFilter = !!(searchTerm || selectedCourseId || selectedBatchId);
  const selectedCourseName = courseOptions.find((c) => c.value === selectedCourseId)?.label;
  const selectedBatchName = batchOptions.find((b) => b.value === selectedBatchId)?.label;

  // Filter students based on search term
  const filteredStudents = students.filter(student => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      student.firstName?.toLowerCase().includes(searchLower) ||
      student.lastName?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower) ||
      student.username?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <PageLayout
      title="Student Management"
      showInstituteDropdown={currentUser.role === 'super-admin'}
      institutes={superAdminContext?.allInstitutes || []}
      selectedInstitute={superAdminContext?.selectedInstitute || null}
      onInstituteChange={superAdminContext?.handleInstituteChange || (() => {})}
      institutesLoading={superAdminContext?.institutesLoading || false}
    >
      <div className="p-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Student Management</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {displayInstitute ?
                  `Manage students for ${displayInstitute.name}` :
                  'Manage students for your institute'
                }
              </p>
            </div>
            
            {/* Create Student Button */}
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <Icon name="Plus" size={16} />
              Add Student
            </Button>
          </div>

          {/* Search + Course/Batch filters */}
          <div className="mb-6 flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="relative w-full lg:max-w-xs">
              <Icon
                name="Search"
                size={16}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="w-full sm:w-56">
              <Select
                label="Course"
                placeholder="All Courses"
                clearable
                loading={coursesLoading}
                value={selectedCourseId}
                onChange={(value) => {
                  setSelectedCourseId(value || '');
                  setSelectedBatchId('');
                }}
                options={courseOptions}
              />
            </div>

            <div className="w-full sm:w-56">
              <Select
                label="Batch"
                placeholder={selectedCourseId ? 'All Batches' : 'Select a course first'}
                clearable
                disabled={!selectedCourseId}
                loading={batchesLoading}
                value={selectedBatchId}
                onChange={(value) => setSelectedBatchId(value || '')}
                options={batchOptions}
              />
            </div>

            {(selectedCourseId || selectedBatchId) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCourseId('');
                  setSelectedBatchId('');
                }}
                className="flex items-center gap-2"
              >
                <Icon name="X" size={16} />
                Clear filters
              </Button>
            )}
          </div>

          {/* Students Table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {loading ? (
              <div className="p-4 sm:p-8 text-center">
                <Icon name="Loader2" size={32} className="animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading students...</p>
              </div>
            ) : error ? (
              <div className="p-4 sm:p-8 text-center">
                <Icon name="AlertCircle" size={32} className="mx-auto mb-4 text-destructive" />
                <p className="text-destructive">{error}</p>
                <Button onClick={loadStudents} className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-4 sm:p-8 text-center">
                <Icon name="GraduationCap" size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {hasActiveFilter ? 'No students found' : 'No students yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {hasActiveFilter
                    ? 'Try adjusting your search or course/batch filters'
                    : 'Get started by adding your first student'
                  }
                </p>
                {!hasActiveFilter && (
                  <Button
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Icon name="Plus" size={16} className="mr-2" />
                    Add First Student
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-4 font-semibold text-foreground">Name</th>
                      <th className="text-left p-4 font-semibold text-foreground">Email</th>
                      <th className="text-left p-4 font-semibold text-foreground">Username</th>
                      <th className="text-left p-4 font-semibold text-foreground">Courses / Batches</th>
                      <th className="text-left p-4 font-semibold text-foreground">Status</th>
                      <th className="text-center p-4 font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.id}
                        onClick={() => navigate(`/student-profile/${student.id}`)}
                        className="border-b border-border hover:bg-muted/30 cursor-pointer"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-green-600 font-semibold text-sm">
                                {student.firstName?.[0]?.toUpperCase() || student.username?.[0]?.toUpperCase() || 'S'}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-foreground">
                                {student.firstName} {student.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Student ID: {student.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-foreground">{student.email}</td>
                        <td className="p-4 text-foreground">{student.username}</td>
                        <td className="p-4">
                          {(() => {
                            const courseEnrollments = Array.isArray(student.courseEnrollments) ? student.courseEnrollments : [];
                            const batchMemberships = Array.isArray(student.batchMemberships) ? student.batchMemberships : [];
                            if (courseEnrollments.length === 0 && batchMemberships.length === 0) {
                              return student.course
                                ? <span className="text-sm text-muted-foreground">{student.course}</span>
                                : <span className="text-sm text-muted-foreground">—</span>;
                            }
                            return (
                              <div className="flex flex-wrap gap-1">
                                {courseEnrollments.map((en, i) => (
                                  <span
                                    key={en.enrollmentId || `c${i}`}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700"
                                    title={en.fee != null ? `Fee: ₹${Number(en.fee).toLocaleString('en-IN')}` : undefined}
                                  >
                                    <Icon name="BookOpen" size={11} />
                                    {en.courseName || `Course #${en.courseId}`}
                                  </span>
                                ))}
                                {batchMemberships.map((m, i) => (
                                  <span
                                    key={m.membershipId || `b${i}`}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-violet-50 text-violet-700"
                                  >
                                    <Icon name="Users" size={11} />
                                    {m.batchName || `Batch #${m.batchId}`}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditStudent(student);
                              }}
                              className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                              title="Edit student"
                            >
                              <Icon name="Edit" size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStudent(student.id);
                              }}
                              className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                              title="Delete student"
                            >
                              <Icon name="Trash2" size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Infinite scroll: load the next page when scrolled into view */}
          {!loading && !error && (
            <>
              <InfiniteScrollSentinel
                hasMore={pagination.hasMore}
                loading={loadingMore}
                onLoadMore={loadMoreStudents}
              />
              {loadingMore && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  <Icon name="Loader2" size={20} className="animate-spin mx-auto mb-1" />
                  Loading more students...
                </div>
              )}
            </>
          )}

          {/* Stats Footer */}
          {!loading && !error && (
            <div className="mt-6 text-sm text-muted-foreground">
              Showing {filteredStudents.length} of {students.length} students
              {selectedBatchName
                ? ` in batch "${selectedBatchName}"`
                : selectedCourseName
                  ? ` in course "${selectedCourseName}"`
                  : ''}
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
          )}
        </div>

      {/* Create Student Modal */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
        userRole="STUDENT"
        defaultInstituteId={currentUser.role === 'super-admin' ? superAdminContext?.selectedInstitute?.id : currentUser.instituteId}
        defaultInstitute={currentUser.role === 'super-admin' ? superAdminContext?.selectedInstitute : instituteData.institute}
      />

      {/* Edit Student Modal */}
      {editingStudent && (
        <CreateUserModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingStudent(null);
          }}
          onSuccess={handleEditSuccess}
          userRole="STUDENT"
          defaultInstituteId={currentUser.role === 'super-admin' ? superAdminContext?.selectedInstitute?.id : currentUser.instituteId}
          defaultInstitute={currentUser.role === 'super-admin' ? superAdminContext?.selectedInstitute : instituteData.institute}
          editMode={true}
          existingUser={editingStudent}
        />
      )}
    </PageLayout>
  );
};

export default StudentManagement;
