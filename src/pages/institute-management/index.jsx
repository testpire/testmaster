import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import { newUserService } from '../../services/newUserService';
import { newInstituteService } from '../../services/newInstituteService';
import PageLayout from '../../components/layout/PageLayout';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import CreateUserModal from '../super-admin-dashboard/components/CreateUserModal';
import CreateInstituteModal from '../super-admin-dashboard/components/CreateInstituteModal';

const InstituteManagement = () => {
  const { user, userProfile } = useAuth();
  
  // Try to get SuperAdmin context (will be null if not in super admin routes)
  let superAdminContext = null;
  try {
    superAdminContext = useSuperAdmin();
  } catch (e) {
    // Context not available - user is not a super admin or not in super admin routes
  }

  // Institute admin management states
  const [instituteAdmins, setInstituteAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateInstituteModal, setShowCreateInstituteModal] = useState(false);

  // Institute selection states
  const [allInstitutes, setAllInstitutes] = useState([]);
  const [selectedInstitute, setSelectedInstitute] = useState(null);
  const [institutesLoading, setInstitutesLoading] = useState(true);

  // Get current user info
  const currentUser = {
    name: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Admin',
    firstName: userProfile?.firstName || user?.firstName || 'Admin',
    role: userProfile?.role?.toLowerCase()?.replace('_', '-') || 'super-admin',
    email: userProfile?.email || user?.email,
    avatar: userProfile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    notifications: 3,
    instituteId: userProfile?.instituteId || user?.instituteId
  };

  // Load institutes and institute admins
  useEffect(() => {
    // Only load data if we have user authentication data
    if (user || userProfile) {
      fetchInstitutes();
    } else {
      setLoading(true);
      setError('Loading user information...');
    }
  }, [user, userProfile]);

  // Load institute admins when selected institute changes
  useEffect(() => {
    if (selectedInstitute) {
      loadInstituteAdmins();
    }
  }, [selectedInstitute]);

  const fetchInstitutes = async () => {
    setInstitutesLoading(true);
    try {
      const { data, error } = await newInstituteService.getInstitutes();
      
      if (error) {
        console.error('Error fetching institutes:', error);
        setInstitutesLoading(false);
        return;
      }

      const institutes = data || [];
      setAllInstitutes(institutes);
      
      // Set default to first institute if available
      if (institutes.length > 0 && !selectedInstitute) {
        setSelectedInstitute(institutes[0]);
      }
      
      setInstitutesLoading(false);
    } catch (err) {
      console.error('Error fetching institutes:', err);
      setInstitutesLoading(false);
    }
  };

  const loadInstituteAdmins = async () => {
    if (!selectedInstitute) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Loading institute admins for institute:', selectedInstitute.name);
      // Get all users and filter for institute admins in the selected institute
      const { data, error } = await newUserService.getUsers({ role: 'INST_ADMIN' });
      
      console.log('Institute admin API response:', { data, error });
      
      if (error) {
        setError(typeof error === 'string' ? error : error.message || 'Failed to load institute admins');
        setLoading(false);
        return;
      }

      // Filter for institute admins in the selected institute
      const filteredAdmins = (data || []).filter(admin => 
        admin.role === 'INST_ADMIN' && admin.instituteId === selectedInstitute.id
      );

      console.log('Filtered institute admins:', filteredAdmins);
      setInstituteAdmins(filteredAdmins);
      setLoading(false);
    } catch (err) {
      console.error('Error loading institute admins:', err);
      setError('Failed to load institute admins: ' + err.message);
      setLoading(false);
    }
  };


  const handleInstituteChange = (instituteId) => {
    const institute = allInstitutes.find(inst => inst.id === instituteId);
    if (institute) {
      setSelectedInstitute(institute);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    loadInstituteAdmins(); // Reload the list
  };

  const handleInstituteCreateSuccess = (instituteData) => {
    setShowCreateInstituteModal(false);
    // Refresh institutes list in SuperAdminContext
    if (superAdminContext?.fetchInstitutes) {
      superAdminContext.fetchInstitutes();
    } else {
      // Fallback: refresh local institutes
      fetchInstitutes();
    }
    // Optionally show success message
    console.log('Institute created successfully:', instituteData);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setEditingAdmin(null);
    loadInstituteAdmins(); // Reload the list
  };

  const handleEditAdmin = (admin) => {
    setEditingAdmin(admin);
    setShowEditModal(true);
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to delete this institute admin? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await newUserService.deleteUser(adminId);
      
      if (error) {
        alert('Failed to delete institute admin: ' + error);
        return;
      }

      loadInstituteAdmins(); // Reload the list
    } catch (err) {
      console.error('Error deleting institute admin:', err);
      alert('Failed to delete institute admin');
    }
  };

  // Filter institute admins based on search term
  const filteredAdmins = instituteAdmins.filter(admin => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      admin.firstName?.toLowerCase().includes(searchLower) ||
      admin.lastName?.toLowerCase().includes(searchLower) ||
      admin.email?.toLowerCase().includes(searchLower) ||
      admin.username?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <PageLayout 
      title="Institute Management"
      showInstituteDropdown={currentUser.role === 'super-admin'}
      institutes={superAdminContext?.allInstitutes || allInstitutes}
      selectedInstitute={superAdminContext?.selectedInstitute || selectedInstitute}
      onInstituteChange={superAdminContext?.handleInstituteChange || handleInstituteChange}
      institutesLoading={superAdminContext?.institutesLoading || institutesLoading}
    >
      <div className="p-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Institute Management</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {(superAdminContext?.selectedInstitute || selectedInstitute) ? 
                  `Manage institute admins for ${(superAdminContext?.selectedInstitute || selectedInstitute).name}` : 
                  'Select an institute to manage its admins'
                }
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Create Institute Button */}
              <Button
                onClick={() => setShowCreateInstituteModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <Icon name="Building" size={16} />
                Add Institute
              </Button>
              
              {/* Create Institute Admin Button */}
              {(superAdminContext?.selectedInstitute || selectedInstitute) && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                >
                  <Icon name="Plus" size={16} />
                  Add Institute Admin
                </Button>
              )}
            </div>
          </div>

          {/* Institute Selection Status */}
          {!(superAdminContext?.selectedInstitute || selectedInstitute) && !(superAdminContext?.institutesLoading || institutesLoading) && (
            <div className="bg-card rounded-lg border border-border p-8 text-center">
              <Icon name="Building2" size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Select an Institute</h3>
              <p className="text-muted-foreground">
                Use the institute dropdown at the top to select an institute and view its admins
              </p>
            </div>
          )}

          {/* Search Bar */}
          {(superAdminContext?.selectedInstitute || selectedInstitute) && (
            <div className="mb-6">
              <div className="relative max-w-md">
                <Icon
                  name="Search"
                  size={16}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Search institute admins..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          )}

          {/* Institute Admins Table */}
          {selectedInstitute && (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <Icon name="Loader2" size={32} className="animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Loading institute admins...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <Icon name="AlertCircle" size={32} className="mx-auto mb-4 text-destructive" />
                  <p className="text-destructive">{error}</p>
                  <Button onClick={loadInstituteAdmins} className="mt-4">
                    Try Again
                  </Button>
                </div>
              ) : filteredAdmins.length === 0 ? (
                <div className="p-8 text-center">
                  <Icon name="UserCog" size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {searchTerm ? 'No admins found' : 'No institute admins yet'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm 
                      ? 'Try adjusting your search terms' 
                      : 'Get started by adding the first institute admin'
                    }
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Icon name="Plus" size={16} className="mr-2" />
                      Add First Institute Admin
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
                      {filteredAdmins.map((admin) => (
                        <tr key={admin.id} className="border-b border-border hover:bg-muted/30">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-purple-600 font-semibold text-sm">
                                  {admin.firstName?.[0]?.toUpperCase() || admin.username?.[0]?.toUpperCase() || 'A'}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-foreground">
                                  {admin.firstName} {admin.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Admin ID: {admin.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-foreground">{admin.email}</td>
                          <td className="p-4 text-foreground">{admin.username}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Active
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditAdmin(admin)}
                                className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                                title="Edit institute admin"
                              >
                                <Icon name="Edit" size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteAdmin(admin.id)}
                                className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                                title="Delete institute admin"
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
          )}

          {/* Stats Footer */}
          {(superAdminContext?.selectedInstitute || selectedInstitute) && !loading && !error && filteredAdmins.length > 0 && (
            <div className="mt-6 text-sm text-muted-foreground">
              Showing {filteredAdmins.length} of {instituteAdmins.length} institute admins
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
          )}
        </div>

      {/* Create Institute Admin Modal */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
        userRole="INST_ADMIN"
        defaultInstituteId={(superAdminContext?.selectedInstitute || selectedInstitute)?.id}
        defaultInstitute={superAdminContext?.selectedInstitute || selectedInstitute}
      />

      {/* Edit Institute Admin Modal */}
      {editingAdmin && (
        <CreateUserModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingAdmin(null);
          }}
          onSuccess={handleEditSuccess}
          userRole="INST_ADMIN"
          defaultInstituteId={(superAdminContext?.selectedInstitute || selectedInstitute)?.id}
          defaultInstitute={superAdminContext?.selectedInstitute || selectedInstitute}
          editMode={true}
          existingUser={editingAdmin}
        />
      )}

      {/* Create Institute Modal */}
      <CreateInstituteModal
        isOpen={showCreateInstituteModal}
        onClose={() => setShowCreateInstituteModal(false)}
        onSuccess={handleInstituteCreateSuccess}
      />
    </PageLayout>
  );
};

export default InstituteManagement;
