import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import UserActionModal from './UserActionModal';
import { newInstituteService } from '../../../services/newInstituteService';
import { newDashboardService } from '../../../services/newDashboardService';
import { newUserService } from '../../../services/newUserService';

const UserManagementTree = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [institutes, setInstitutes] = useState([]);
  const [users, setUsers] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [error, setError] = useState(null);
  
  // User action modal states
  const [actionModal, setActionModal] = useState({ 
    isOpen: false, 
    user: null, 
    actionType: null 
  });

  // Fetch data on component mount
  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch institutes and users in parallel
      const [institutesResult, usersResult] = await Promise.all([
        newInstituteService.getInstitutes(),
        newDashboardService.getAllUsers()
      ]);

      if (institutesResult.error) {
        throw new Error(institutesResult.error.message || 'Failed to fetch institutes');
      }

      if (usersResult.error) {
        throw new Error(usersResult.error.message || 'Failed to fetch users');
      }

      setInstitutes(institutesResult.data || []);
      setUsers(usersResult.data || []);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle node expansion
  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Handle user actions
  const handleUserAction = (user, actionType) => {
    setActionModal({
      isOpen: true,
      user,
      actionType
    });
  };

  const closeActionModal = () => {
    setActionModal({ isOpen: false, user: null, actionType: null });
  };

  const handleActionSuccess = (message) => {
    console.log('Action successful:', message);
    // Refresh data after successful action
    fetchData();
    closeActionModal();
  };

  // Filter users by role
  const filterUsers = (users, role) => {
    if (selectedFilter === 'ALL') {
      return users.filter(user => user.role === role);
    }
    return users.filter(user => user.role === role);
  };

  // Group users by institute
  const groupUsersByInstitute = (users) => {
    const grouped = {
      instituted: {},
      orphaned: []
    };

    users.forEach(user => {
      if (user.instituteId) {
        if (!grouped.instituted[user.instituteId]) {
          grouped.instituted[user.instituteId] = {
            teachers: [],
            students: []
          };
        }
        if (user.role === 'TEACHER') {
          grouped.instituted[user.instituteId].teachers.push(user);
        } else if (user.role === 'STUDENT') {
          grouped.instituted[user.instituteId].students.push(user);
        }
      } else {
        grouped.orphaned.push(user);
      }
    });

    return grouped;
  };

  // Search filter function
  const searchFilter = (item, term) => {
    if (!term) return true;
    const lowerTerm = term.toLowerCase();
    
    if (item.name) {
      // Institute search
      return item.name.toLowerCase().includes(lowerTerm) ||
             item.instituteCode?.toLowerCase().includes(lowerTerm);
    } else {
      // User search
      return item.firstName?.toLowerCase().includes(lowerTerm) ||
             item.lastName?.toLowerCase().includes(lowerTerm) ||
             item.email?.toLowerCase().includes(lowerTerm) ||
             item.username?.toLowerCase().includes(lowerTerm);
    }
  };

  const filteredUsers = users.filter(user => searchFilter(user, searchTerm));
  const groupedUsers = groupUsersByInstitute(filteredUsers);
  const filteredInstitutes = institutes.filter(institute => searchFilter(institute, searchTerm));

  // Get statistics
  const stats = {
    totalInstitutes: institutes.length,
    totalTeachers: users.filter(u => u.role === 'TEACHER').length,
    totalStudents: users.filter(u => u.role === 'STUDENT').length,
    orphanedUsers: groupedUsers.orphaned.length
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg w-11/12 h-5/6 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">User Management Tree</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage institutes, teachers, and students hierarchically
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        {/* Statistics Bar */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 border-b border-border">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalInstitutes}</div>
            <div className="text-xs text-muted-foreground">Institutes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-secondary">{stats.totalTeachers}</div>
            <div className="text-xs text-muted-foreground">Teachers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{stats.totalStudents}</div>
            <div className="text-xs text-muted-foreground">Students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-destructive">{stats.orphanedUsers}</div>
            <div className="text-xs text-muted-foreground">Orphaned</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4 p-4 border-b border-border">
          <div className="flex-1">
            <Input
              placeholder="Search institutes, teachers, or students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('ALL')}
            >
              All
            </Button>
            <Button
              variant={selectedFilter === 'TEACHERS' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('TEACHERS')}
            >
              Teachers
            </Button>
            <Button
              variant={selectedFilter === 'STUDENTS' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('STUDENTS')}
            >
              Students
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <Icon name="RefreshCw" size={16} />
            Refresh
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Icon name="Loader2" size={32} className="animate-spin text-primary mb-2" />
                <p className="text-muted-foreground">Loading user data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Icon name="AlertCircle" size={32} className="text-destructive mb-2" />
                <p className="text-destructive mb-2">Error loading data</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchData} variant="outline">
                  <Icon name="RefreshCw" size={16} />
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Institutes Tree */}
              <div className="space-y-1">
                {filteredInstitutes.map((institute) => {
                  const instituteId = `institute-${institute.id}`;
                  const isExpanded = expandedNodes.has(instituteId);
                  const instituteUsers = groupedUsers.instituted[institute.id] || { teachers: [], students: [] };
                  const totalUsers = instituteUsers.teachers.length + instituteUsers.students.length;
                  
                  return (
                    <div key={institute.id} className="border border-border rounded-lg">
                      {/* Institute Node */}
                      <div 
                        className="flex items-center p-3 hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleNode(instituteId)}
                      >
                        <Icon 
                          name={isExpanded ? "ChevronDown" : "ChevronRight"} 
                          size={16} 
                          className="text-muted-foreground mr-2"
                        />
                        <Icon name="Building" size={18} className="text-primary mr-3" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-foreground">{institute.name}</span>
                              <span className="text-sm text-muted-foreground ml-2">({institute.instituteCode})</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {instituteUsers.teachers.length} teachers, {instituteUsers.students.length} students
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Institute Children */}
                      {isExpanded && (
                        <div className="pl-8 pb-2">
                          {/* Teachers Section */}
                          {instituteUsers.teachers.length > 0 && (selectedFilter === 'ALL' || selectedFilter === 'TEACHERS') && (
                            <div className="mb-2">
                              <div className="flex items-center mb-1">
                                <Icon name="GraduationCap" size={14} className="text-secondary mr-2" />
                                <span className="text-sm font-medium text-secondary">Teachers ({instituteUsers.teachers.length})</span>
                              </div>
                              {instituteUsers.teachers.map((teacher) => (
                                <div key={teacher.id} className="flex items-center p-2 ml-6 hover:bg-muted/30 rounded">
                                  <Icon name="User" size={14} className="text-muted-foreground mr-2" />
                                  <div className="flex-1">
                                    <span className="text-sm text-foreground">
                                      {teacher.firstName} {teacher.lastName}
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-2">({teacher.email})</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUserAction(teacher, 'edit');
                                      }}
                                      title="Edit teacher"
                                    >
                                      <Icon name="Edit" size={12} />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUserAction(teacher, 'move');
                                      }}
                                      title="Move to different institute"
                                    >
                                      <Icon name="ArrowRightLeft" size={12} />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Students Section */}
                          {instituteUsers.students.length > 0 && (selectedFilter === 'ALL' || selectedFilter === 'STUDENTS') && (
                            <div>
                              <div className="flex items-center mb-1">
                                <Icon name="Users" size={14} className="text-accent mr-2" />
                                <span className="text-sm font-medium text-accent">Students ({instituteUsers.students.length})</span>
                              </div>
                              {instituteUsers.students.map((student) => (
                                <div key={student.id} className="flex items-center p-2 ml-6 hover:bg-muted/30 rounded">
                                  <Icon name="User" size={14} className="text-muted-foreground mr-2" />
                                  <div className="flex-1">
                                    <span className="text-sm text-foreground">
                                      {student.firstName} {student.lastName}
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-2">({student.email})</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUserAction(student, 'edit');
                                      }}
                                      title="Edit student"
                                    >
                                      <Icon name="Edit" size={12} />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUserAction(student, 'move');
                                      }}
                                      title="Move to different institute"
                                    >
                                      <Icon name="ArrowRightLeft" size={12} />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Orphaned Users Section */}
              {groupedUsers.orphaned.length > 0 && (
                <div className="border border-destructive/20 rounded-lg bg-destructive/5">
                  <div 
                    className="flex items-center p-3 hover:bg-destructive/10 cursor-pointer"
                    onClick={() => toggleNode('orphaned')}
                  >
                    <Icon 
                      name={expandedNodes.has('orphaned') ? "ChevronDown" : "ChevronRight"} 
                      size={16} 
                      className="text-muted-foreground mr-2"
                    />
                    <Icon name="AlertTriangle" size={18} className="text-destructive mr-3" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-destructive">Orphaned Users</span>
                        <span className="text-sm text-muted-foreground">
                          {groupedUsers.orphaned.length} users without institute
                        </span>
                      </div>
                    </div>
                  </div>

                  {expandedNodes.has('orphaned') && (
                    <div className="pl-8 pb-2">
                      {groupedUsers.orphaned.map((user) => (
                        <div key={user.id} className="flex items-center p-2 ml-6 hover:bg-destructive/10 rounded">
                          <Icon 
                            name={user.role === 'TEACHER' ? 'GraduationCap' : 'User'} 
                            size={14} 
                            className="text-muted-foreground mr-2" 
                          />
                          <div className="flex-1">
                            <span className="text-sm text-foreground">
                              {user.firstName} {user.lastName}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({user.email}) - {user.role}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUserAction(user, 'move');
                              }}
                              title="Assign to institute"
                            >
                              <Icon name="Building" size={12} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUserAction(user, 'edit');
                              }}
                              title="Edit user"
                            >
                              <Icon name="Edit" size={12} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUserAction(user, 'delete');
                              }}
                              title="Delete user"
                            >
                              <Icon name="Trash2" size={12} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Empty State */}
              {filteredInstitutes.length === 0 && groupedUsers.orphaned.length === 0 && (
                <div className="text-center py-12">
                  <Icon name="Search" size={48} className="text-muted-foreground mb-4 mx-auto" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No results found for your search.' : 'No data available.'}
                  </p>
                  {searchTerm && (
                    <Button variant="outline" onClick={() => setSearchTerm('')} className="mt-2">
                      Clear Search
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Action Modal */}
        <UserActionModal
          isOpen={actionModal.isOpen}
          onClose={closeActionModal}
          user={actionModal.user}
          institutes={institutes}
          actionType={actionModal.actionType}
          onSuccess={handleActionSuccess}
        />
      </div>
    </div>
  );
};

export default UserManagementTree;
