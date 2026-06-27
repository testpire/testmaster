import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import useMyPermissions from '../../hooks/useMyPermissions';
import { newUserService } from '../../services/newUserService';
import { newInstituteService } from '../../services/newInstituteService';
import PageLayout from '../../components/layout/PageLayout';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import InfiniteScrollSentinel from '../../components/ui/InfiniteScrollSentinel';
import SetPasswordModal from '../../components/ui/SetPasswordModal';

const TeacherManagement = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const { can } = useMyPermissions();

  // Try to get SuperAdmin context (will be null if not in super admin routes)
  let superAdminContext = null;
  try {
    superAdminContext = useSuperAdmin();
  } catch (e) {
    // Context not available - user is not a super admin or not in super admin routes
  }

  // Teacher management states
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 0, hasMore: false });
  const loadingMoreRef = useRef(false);
  // Grand total of teachers (from the search API's totalCount); null until loaded.
  const [totalTeachers, setTotalTeachers] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Teacher whose password the admin is setting (drives SetPasswordModal); null = closed.
  const [passwordTarget, setPasswordTarget] = useState(null);

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


  // Load institute data + teachers on mount, and reload when a super-admin switches
  // institute. Keyed on the stable auth user id (user/userProfile settle in separate
  // renders, so depending on both double-fires the load) and the active institute id.
  // loadInstituteData is a no-op for super-admins (they have no own instituteId).
  const authUserId = (userProfile || user)?.id ?? null;
  const selectedInstituteId = superAdminContext?.selectedInstitute?.id ?? null;
  useEffect(() => {
    if (!authUserId) {
      setLoading(true);
      setError('Loading user information...');
      return;
    }
    loadInstituteData();
    loadTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, selectedInstituteId]);

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

  // Load a page of teachers. page 0 replaces the list (fresh load / filter change);
  // higher pages append (infinite scroll). Institute scoping is handled server-side
  // via the JWT / X-Institute-Id header, so no criteria are passed here.
  const loadTeachers = async (page = 0) => {
    if (page === 0) {
      setLoading(true);
      setError(null);
    }

    try {
      const { data, pagination: pg, error } = await newUserService.getTeachers({ page, size: 20 });

      if (error) {
        if (page === 0) {
          setError(typeof error === 'string' ? error : error.message || 'Failed to load teachers');
          setTeachers([]);
        }
        return;
      }

      const list = Array.isArray(data) ? data : [];
      setTeachers((prev) => (page === 0 ? list : [...prev, ...list]));
      setPagination({ currentPage: pg?.currentPage ?? page, hasMore: !!pg?.hasMore });
      if (typeof pg?.totalElements === 'number') setTotalTeachers(pg.totalElements);
    } catch (err) {
      console.error('Error loading teachers:', err);
      if (page === 0) {
        setError('Failed to load teachers: ' + err.message);
        setTeachers([]);
      }
    } finally {
      if (page === 0) setLoading(false);
    }
  };

  // Fetch and append the next page (infinite scroll). loadingMoreRef guards against
  // a burst of sentinel triggers firing overlapping fetches.
  const loadMoreTeachers = async () => {
    if (loading || loadingMoreRef.current || !pagination.hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      await loadTeachers(pagination.currentPage + 1);
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };


  // Navigate to the full-page create/edit user form. The list reloads on return
  // because this page remounts (its mount effect refetches teachers).
  const goToUserForm = (extra = {}) => {
    navigate('/user-form', {
      state: {
        userRole: 'TEACHER',
        defaultInstituteId: currentUser.role === 'super-admin' ? superAdminContext?.selectedInstitute?.id : currentUser.instituteId,
        defaultInstitute: currentUser.role === 'super-admin' ? superAdminContext?.selectedInstitute : instituteData.institute,
        returnTo: '/teacher-management',
        ...extra
      }
    });
  };

  const handleEditTeacher = (teacher) => {
    goToUserForm({ editMode: true, existingUser: teacher });
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (!window.confirm('Are you sure you want to delete this teacher? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await newUserService.deleteUser(teacherId, 'TEACHER');
      
      if (error) {
        const message = typeof error === 'string'
          ? error
          : error?.message || error?.error || JSON.stringify(error);
        alert('Failed to delete teacher: ' + message);
        return;
      }

      loadTeachers(); // Reload the list
    } catch (err) {
      console.error('Error deleting teacher:', err);
      alert('Failed to delete teacher');
    }
  };

  // Filter teachers based on search term
  const filteredTeachers = teachers.filter(teacher => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      teacher.firstName?.toLowerCase().includes(searchLower) ||
      teacher.lastName?.toLowerCase().includes(searchLower) ||
      teacher.email?.toLowerCase().includes(searchLower) ||
      teacher.username?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <PageLayout 
      title="Teacher Management"
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
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display font-semibold text-2xl text-foreground">Teacher Management</h1>
                {totalTeachers != null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-semibold">
                    <Icon name="GraduationCap" size={14} />
                    {totalTeachers.toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {currentUser.role === 'super-admin' ? 
                  (superAdminContext?.selectedInstitute ? 
                    `Manage teachers for ${superAdminContext.selectedInstitute.name}` : 
                    'Select an institute to manage teachers'
                  ) :
                  (instituteData.institute ? 
                    `Manage teachers for ${instituteData.institute.name}` : 
                    'Manage teachers for your institute'
                  )
                }
              </p>
            </div>
            
            {/* Create Teacher Button */}
            <Button
              onClick={() => goToUserForm()}
              className="flex items-center gap-2"
            >
              <Icon name="Plus" size={16} />
              Add Teacher
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Icon
                name="Search"
                size={16}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search teachers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/70 focus:border-primary"
              />
            </div>
          </div>

          {/* Teachers Table */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-4 sm:p-8 text-center">
                <Icon name="Loader2" size={32} className="animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading teachers...</p>
              </div>
            ) : error ? (
              <div className="p-4 sm:p-8 text-center">
                <Icon name="AlertCircle" size={32} className="mx-auto mb-4 text-destructive" />
                <p className="text-destructive">{error}</p>
                <Button onClick={loadTeachers} className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="p-4 sm:p-8 text-center">
                <Icon name="Users" size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                  {searchTerm ? 'No teachers found' : 'No teachers yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : 'Get started by adding your first teacher'
                  }
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => goToUserForm()}
                  >
                    <Icon name="Plus" size={16} className="mr-2" />
                    Add First Teacher
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
                      <th className="text-left p-4 font-semibold text-foreground">Status</th>
                      <th className="text-center p-4 font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.map((teacher) => (
                      <tr key={teacher.id} className="border-b border-border hover:bg-muted/30">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-primary font-semibold text-sm">
                                {teacher.firstName?.[0]?.toUpperCase() || teacher.username?.[0]?.toUpperCase() || 'T'}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-foreground">
                                {teacher.firstName} {teacher.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Teacher ID: {teacher.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-foreground">{teacher.email}</td>
                        <td className="p-4 text-foreground">{teacher.username}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">
                            Active
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            {can('TEACHER_UPDATE') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditTeacher(teacher)}
                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                title="Edit teacher"
                              >
                                <Icon name="Edit" size={16} />
                              </Button>
                            )}
                            {can('TEACHER_UPDATE') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPasswordTarget(teacher)}
                                className="h-8 w-8 hover:bg-secondary/10 hover:text-secondary"
                                title="Set password"
                              >
                                <Icon name="KeyRound" size={16} />
                              </Button>
                            )}
                            {can('TEACHER_DELETE') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteTeacher(teacher.id)}
                                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                title="Delete teacher"
                              >
                                <Icon name="Trash2" size={16} />
                              </Button>
                            )}
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
                onLoadMore={loadMoreTeachers}
              />
              {loadingMore && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  <Icon name="Loader2" size={20} className="animate-spin mx-auto mb-1" />
                  Loading more teachers...
                </div>
              )}
            </>
          )}

          {/* Stats Footer */}
          {!loading && !error && (
            <div className="mt-6 text-sm text-muted-foreground">
              Showing {filteredTeachers.length} of {teachers.length} teachers
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
          )}
        </div>

      <SetPasswordModal
        isOpen={!!passwordTarget}
        user={passwordTarget}
        onClose={() => setPasswordTarget(null)}
        onSuccess={(permanent) => {
          const name = `${passwordTarget?.firstName || ''} ${passwordTarget?.lastName || ''}`.trim()
            || passwordTarget?.username || 'teacher';
          setPasswordTarget(null);
          alert(
            permanent
              ? `Password set for ${name}. They can sign in with it right away.`
              : `Temporary password set for ${name}. They'll be asked to change it at next login.`
          );
        }}
      />
    </PageLayout>
  );
};

export default TeacherManagement;
