import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { newUserService } from '../../services/newUserService';
import { newInstituteService } from '../../services/newInstituteService';
import PageLayout from '../../components/layout/PageLayout';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import CreateUserModal from '../super-admin-dashboard/components/CreateUserModal';

const TeacherManagement = () => {
  const { user, userProfile } = useAuth();

  // Teacher management states
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

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
    avatar: userProfile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    notifications: 3,
    instituteId: userProfile?.instituteId || user?.instituteId
  };


  // Load institute data and teachers
  useEffect(() => {
    // Only load data if we have user authentication data
    if (user || userProfile) {
      loadInstituteData();
      loadTeachers();
    } else {
      setLoading(true);
      setError('Loading user information...');
    }
  }, [user, userProfile]);

  const loadInstituteData = async () => {
    if (!currentUser.instituteId) return;

    try {
      const { data, error } = await newInstituteService.getInstituteById(currentUser.instituteId);
      
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

  const loadTeachers = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get teachers for this institute using institute-specific endpoint
      const { data, error } = await newUserService.getTeachers(currentUser.instituteId);
      
      
      if (error) {
        setError(typeof error === 'string' ? error : error.message || 'Failed to load teachers');
        setLoading(false);
        return;
      }

      // Data is already filtered by the API to include only this institute's teachers
      const instituteTeachers = data || [];
      

      setTeachers(instituteTeachers);
      setLoading(false);
    } catch (err) {
      console.error('Error loading teachers:', err);
      setError('Failed to load teachers: ' + err.message);
      setLoading(false);
    }
  };


  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    loadTeachers(); // Reload the list
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setEditingTeacher(null);
    loadTeachers(); // Reload the list
  };

  const handleEditTeacher = (teacher) => {
    setEditingTeacher(teacher);
    setShowEditModal(true);
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (!window.confirm('Are you sure you want to delete this teacher? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await newUserService.deleteUser(teacherId);
      
      if (error) {
        alert('Failed to delete teacher: ' + error);
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
    <PageLayout title="Teacher Management">
      <div className="p-6">


          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Teacher Management</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {instituteData.institute ? 
                  `Manage teachers for ${instituteData.institute.name}` : 
                  'Manage teachers for your institute'
                }
              </p>
            </div>
            
            {/* Create Teacher Button */}
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
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
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Teachers Table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <Icon name="Loader2" size={32} className="animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading teachers...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <Icon name="AlertCircle" size={32} className="mx-auto mb-4 text-destructive" />
                <p className="text-destructive">{error}</p>
                <Button onClick={loadTeachers} className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="p-8 text-center">
                <Icon name="Users" size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
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
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
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
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
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
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTeacher(teacher)}
                              className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                              title="Edit teacher"
                            >
                              <Icon name="Edit" size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTeacher(teacher.id)}
                              className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                              title="Delete teacher"
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

          {/* Stats Footer */}
          {!loading && !error && (
            <div className="mt-6 text-sm text-muted-foreground">
              Showing {filteredTeachers.length} of {teachers.length} teachers
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
          )}
        </div>

      {/* Create Teacher Modal */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
        userRole="TEACHER"
        defaultInstituteId={currentUser.instituteId}
        defaultInstitute={instituteData.institute}
      />

      {/* Edit Teacher Modal */}
      {editingTeacher && (
        <CreateUserModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingTeacher(null);
          }}
          onSuccess={handleEditSuccess}
          userRole="TEACHER"
          defaultInstituteId={currentUser.instituteId}
          defaultInstitute={instituteData.institute}
          editMode={true}
          existingUser={editingTeacher}
        />
      )}
    </PageLayout>
  );
};

export default TeacherManagement;
