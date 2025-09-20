import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { newUserService } from '../../services/newUserService';
import { newInstituteService } from '../../services/newInstituteService';
import PageLayout from '../../components/layout/PageLayout';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import CreateUserModal from '../super-admin-dashboard/components/CreateUserModal';

const StudentManagement = () => {
  const { user, userProfile } = useAuth();

  // Student management states
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
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

  // Load institute data and students  
  useEffect(() => {
    // Only load data if we have user authentication data
    if (user || userProfile) {
      loadInstituteData();
      loadStudents();
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

  const loadStudents = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get students for this institute using institute-specific endpoint
      const { data, error } = await newUserService.getStudentsByBatch(null, currentUser.instituteId);
      
      if (error) {
        setError(typeof error === 'string' ? error : error.message || 'Failed to load students');
        setLoading(false);
        return;
      }

      // Data is already filtered by the API to include only this institute's students
      const instituteStudents = data || [];

      setStudents(instituteStudents);
      setLoading(false);
    } catch (err) {
      console.error('Error loading students:', err);
      setError('Failed to load students: ' + err.message);
      setLoading(false);
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
    <PageLayout title="Student Management">
      <div className="p-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Student Management</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {instituteData.institute ? 
                  `Manage students for ${instituteData.institute.name}` : 
                  'Manage students for your institute'
                }
              </p>
            </div>
            
            {/* Create Student Button */}
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Icon name="Plus" size={16} />
              Add Student
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
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <Icon name="Loader2" size={32} className="animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading students...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <Icon name="AlertCircle" size={32} className="mx-auto mb-4 text-destructive" />
                <p className="text-destructive">{error}</p>
                <Button onClick={loadStudents} className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 text-center">
                <Icon name="GraduationCap" size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {searchTerm ? 'No students found' : 'No students yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : 'Get started by adding your first student'
                  }
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
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
                      <th className="text-left p-4 font-semibold text-foreground">Status</th>
                      <th className="text-center p-4 font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="border-b border-border hover:bg-muted/30">
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
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditStudent(student)}
                              className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                              title="Edit student"
                            >
                              <Icon name="Edit" size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteStudent(student.id)}
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

          {/* Stats Footer */}
          {!loading && !error && (
            <div className="mt-6 text-sm text-muted-foreground">
              Showing {filteredStudents.length} of {students.length} students
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
        defaultInstituteId={currentUser.instituteId}
        defaultInstitute={instituteData.institute}
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
          defaultInstituteId={currentUser.instituteId}
          defaultInstitute={instituteData.institute}
          editMode={true}
          existingUser={editingStudent}
        />
      )}
    </PageLayout>
  );
};

export default StudentManagement;
