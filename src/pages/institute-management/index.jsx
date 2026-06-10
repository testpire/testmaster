import React, { useState, useEffect, useMemo } from 'react';
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

  // Data states
  const [institutes, setInstitutes] = useState([]);
  const [institutesLoading, setInstitutesLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI states
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  // Modal states
  const [showCreateInstituteModal, setShowCreateInstituteModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [modalInstitute, setModalInstitute] = useState(null);
  const [editingAdmin, setEditingAdmin] = useState(null);

  const currentRole = userProfile?.role?.toLowerCase()?.replace('_', '-') || 'super-admin';

  // Load institutes + institute admins once. The /users/INST_ADMIN endpoint returns
  // ALL institute admins (it does not scope by the active institute), so we fetch the
  // full list once and group client-side by instituteId rather than calling per-institute.
  useEffect(() => {
    if (user || userProfile) {
      fetchInstitutes();
      fetchAdmins();
    }
  }, [user, userProfile]);

  const fetchInstitutes = async () => {
    setInstitutesLoading(true);
    try {
      const { data, error: instError } = await newInstituteService.getInstitutes({}, { page: 0, size: 1000 });
      if (instError) {
        console.error('Error fetching institutes:', instError);
        setInstitutes([]);
      } else {
        setInstitutes(data || []);
      }
    } catch (err) {
      console.error('Error fetching institutes:', err);
      setInstitutes([]);
    } finally {
      setInstitutesLoading(false);
    }
  };

  const fetchAdmins = async () => {
    setAdminsLoading(true);
    setError(null);
    try {
      const { data, error: adminError } = await newUserService.getInstituteAdmins();
      if (adminError) {
        setError(typeof adminError === 'string' ? adminError : adminError.message || 'Failed to load institute admins');
        setAdmins([]);
      } else {
        setAdmins(data || []);
      }
    } catch (err) {
      console.error('Error loading institute admins:', err);
      setError('Failed to load institute admins: ' + err.message);
      setAdmins([]);
    } finally {
      setAdminsLoading(false);
    }
  };

  // Group admins by institute id (string-keyed to avoid number/string mismatch).
  const adminsByInstitute = useMemo(() => {
    const map = new Map();
    for (const admin of admins) {
      const key = String(admin.instituteId ?? admin.institute_id ?? admin.institute?.id ?? '');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(admin);
    }
    return map;
  }, [admins]);

  const adminMatchesSearch = (admin, term) => {
    if (!term) return true;
    const t = term.toLowerCase();
    return (
      admin.firstName?.toLowerCase().includes(t) ||
      admin.lastName?.toLowerCase().includes(t) ||
      admin.email?.toLowerCase().includes(t) ||
      admin.username?.toLowerCase().includes(t)
    );
  };

  // An institute is shown if its name/code matches the search, or it has a matching admin.
  const visibleInstitutes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return institutes;
    return institutes.filter((inst) => {
      const instMatch =
        inst.name?.toLowerCase().includes(term) || inst.code?.toLowerCase().includes(term);
      const instAdmins = adminsByInstitute.get(String(inst.id)) || [];
      const adminMatch = instAdmins.some((a) => adminMatchesSearch(a, term));
      return instMatch || adminMatch;
    });
  }, [institutes, adminsByInstitute, searchTerm]);

  const toggleExpand = (instituteId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(instituteId)) next.delete(instituteId);
      else next.add(instituteId);
      return next;
    });
  };

  // Modal handlers
  const openCreateAdmin = (institute) => {
    setEditingAdmin(null);
    setModalInstitute(institute);
    setShowAdminModal(true);
  };

  const openEditAdmin = (admin, institute) => {
    setEditingAdmin(admin);
    setModalInstitute(institute);
    setShowAdminModal(true);
  };

  const handleAdminModalSuccess = () => {
    setShowAdminModal(false);
    setEditingAdmin(null);
    setModalInstitute(null);
    fetchAdmins();
  };

  const handleInstituteCreateSuccess = (instituteData) => {
    setShowCreateInstituteModal(false);
    if (superAdminContext?.fetchInstitutes) {
      superAdminContext.fetchInstitutes(true); // force past the session cache
    }
    fetchInstitutes();
    console.log('Institute created successfully:', instituteData);
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to delete this institute admin? This action cannot be undone.')) {
      return;
    }
    try {
      const { error: delError } = await newUserService.deleteUser(adminId, 'INST_ADMIN');
      if (delError) {
        const message =
          typeof delError === 'string' ? delError : delError?.message || delError?.error || JSON.stringify(delError);
        alert('Failed to delete institute admin: ' + message);
        return;
      }
      fetchAdmins();
    } catch (err) {
      console.error('Error deleting institute admin:', err);
      alert('Failed to delete institute admin');
    }
  };

  const handleDeleteInstitute = async (institute) => {
    const adminCount = (adminsByInstitute.get(String(institute.id)) || []).length;
    const warning = adminCount > 0
      ? `\n\nThis institute has ${adminCount} admin${adminCount === 1 ? '' : 's'} that may also be affected.`
      : '';
    if (!window.confirm(`Delete institute "${institute.name}"? This action cannot be undone.${warning}`)) {
      return;
    }
    try {
      const { error: delError } = await newInstituteService.deleteInstitute(institute.id);
      if (delError) {
        const message =
          typeof delError === 'string' ? delError : delError?.message || delError?.error || JSON.stringify(delError);
        alert('Failed to delete institute: ' + message);
        return;
      }
      if (superAdminContext?.fetchInstitutes) {
        superAdminContext.fetchInstitutes(true); // force past the session cache
      }
      fetchInstitutes();
    } catch (err) {
      console.error('Error deleting institute:', err);
      alert('Failed to delete institute');
    }
  };

  const loading = institutesLoading || adminsLoading;
  const totalAdmins = admins.length;

  return (
    <PageLayout title="Institute Management" showInstituteDropdown={false}>
      <div className="p-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Institute Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse institutes and expand any institute to manage its admins
            </p>
          </div>

          <Button
            onClick={() => setShowCreateInstituteModal(true)}
            className="flex items-center gap-2"
          >
            <Icon name="Building" size={16} />
            Add Institute
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
              placeholder="Search institutes or admins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Institute Tree */}
        {loading ? (
          <div className="bg-card rounded-lg border border-border p-4 sm:p-8 text-center">
            <Icon name="Loader2" size={32} className="animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading institutes...</p>
          </div>
        ) : error ? (
          <div className="bg-card rounded-lg border border-border p-4 sm:p-8 text-center">
            <Icon name="AlertCircle" size={32} className="mx-auto mb-4 text-destructive" />
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchAdmins} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : visibleInstitutes.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-4 sm:p-8 text-center">
            <Icon name="Building2" size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchTerm ? 'No matching institutes' : 'No institutes yet'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding an institute'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleInstitutes.map((institute) => {
              const isExpanded = expandedIds.has(institute.id);
              const allInstAdmins = adminsByInstitute.get(String(institute.id)) || [];
              const term = searchTerm.trim().toLowerCase();
              const shownAdmins = term
                ? allInstAdmins.filter((a) => adminMatchesSearch(a, term))
                : allInstAdmins;

              return (
                <div key={institute.id} className="bg-card rounded-lg border border-border overflow-hidden">
                  {/* Institute Header (clickable) */}
                  <div className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30">
                    <button
                      type="button"
                      onClick={() => toggleExpand(institute.id)}
                      className="flex items-center gap-3 flex-1 text-left min-w-0"
                    >
                      <Icon
                        name={isExpanded ? 'ChevronDown' : 'ChevronRight'}
                        size={18}
                        className="text-muted-foreground flex-shrink-0"
                      />
                      <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon name="Building2" size={18} className="text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">{institute.name}</span>
                          {institute.code && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex-shrink-0">
                              {institute.code}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {allInstAdmins.length} {allInstAdmins.length === 1 ? 'admin' : 'admins'}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        onClick={() => openCreateAdmin(institute)}
                        className="flex items-center gap-2"
                      >
                        <Icon name="Plus" size={16} />
                        <span className="hidden sm:inline">Add Admin</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteInstitute(institute)}
                        className="h-9 w-9 hover:bg-red-50 hover:text-red-600"
                        title="Delete institute"
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
                    </div>
                  </div>

                  {/* Admins (children) */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      {shownAdmins.length === 0 ? (
                        <div className="p-6 text-center">
                          <Icon name="UserCog" size={32} className="mx-auto mb-3 text-muted-foreground opacity-50" />
                          <p className="text-muted-foreground mb-3">
                            {term && allInstAdmins.length > 0
                              ? 'No admins match your search'
                              : 'No institute admins yet'}
                          </p>
                          {!term && (
                            <Button
                              onClick={() => openCreateAdmin(institute)}
                            >
                              <Icon name="Plus" size={16} className="mr-2" />
                              Add First Admin
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
                              {shownAdmins.map((admin) => (
                                <tr key={admin.id} className="border-b border-border last:border-0 hover:bg-muted/30">
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
                                        <div className="text-sm text-muted-foreground">Admin ID: {admin.id}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4 text-foreground">{admin.email}</td>
                                  <td className="p-4 text-foreground">{admin.username}</td>
                                  <td className="p-4">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        admin.enabled === false
                                          ? 'bg-gray-100 text-gray-600'
                                          : 'bg-green-100 text-green-800'
                                      }`}
                                    >
                                      {admin.enabled === false ? 'Disabled' : 'Active'}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center justify-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEditAdmin(admin, institute)}
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
                </div>
              );
            })}
          </div>
        )}

        {/* Stats Footer */}
        {!loading && !error && (
          <div className="mt-6 text-sm text-muted-foreground">
            {visibleInstitutes.length} {visibleInstitutes.length === 1 ? 'institute' : 'institutes'}
            {' · '}
            {totalAdmins} {totalAdmins === 1 ? 'institute admin' : 'institute admins'} total
            {searchTerm && ` (filtered by "${searchTerm}")`}
          </div>
        )}
      </div>

      {/* Create / Edit Institute Admin Modal */}
      <CreateUserModal
        isOpen={showAdminModal}
        onClose={() => {
          setShowAdminModal(false);
          setEditingAdmin(null);
          setModalInstitute(null);
        }}
        onSuccess={handleAdminModalSuccess}
        userRole="INST_ADMIN"
        defaultInstituteId={modalInstitute?.id}
        defaultInstitute={modalInstitute}
        editMode={!!editingAdmin}
        existingUser={editingAdmin}
      />

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
