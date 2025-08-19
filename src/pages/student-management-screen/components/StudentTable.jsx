import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const StudentTable = ({ 
  students, 
  onEditStudent, 
  onViewAnalytics, 
  onManageBatch,
  onDeleteStudent,
  selectedStudents,
  onSelectStudent,
  onSelectAll,
  sortConfig,
  onSort
}) => {
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRowExpansion = (studentId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded?.has(studentId)) {
      newExpanded?.delete(studentId);
    } else {
      newExpanded?.add(studentId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-success text-success-foreground', label: 'Active' },
      inactive: { color: 'bg-muted text-muted-foreground', label: 'Inactive' },
      suspended: { color: 'bg-error text-error-foreground', label: 'Suspended' },
      graduated: { color: 'bg-primary text-primary-foreground', label: 'Graduated' }
    };
    
    const config = statusConfig?.[status] || statusConfig?.active;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  const getPerformanceColor = (score) => {
    if (score >= 90) return 'text-success';
    if (score >= 75) return 'text-primary';
    if (score >= 60) return 'text-warning';
    return 'text-error';
  };

  const getSortIcon = (column) => {
    if (sortConfig?.key !== column) {
      return <Icon name="ArrowUpDown" size={14} className="text-muted-foreground" />;
    }
    return sortConfig?.direction === 'asc' 
      ? <Icon name="ArrowUp" size={14} className="text-primary" />
      : <Icon name="ArrowDown" size={14} className="text-primary" />;
  };

  const handleSort = (column) => {
    onSort(column);
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="p-4 text-left">
                <input
                  type="checkbox"
                  checked={selectedStudents?.length === students?.length && students?.length > 0}
                  onChange={(e) => onSelectAll(e?.target?.checked)}
                  className="rounded border-border"
                />
              </th>
              <th className="p-4 text-left text-sm font-medium text-foreground">Student</th>
              <th 
                className="p-4 text-left text-sm font-medium text-foreground cursor-pointer hover:bg-muted/30"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Name</span>
                  {getSortIcon('name')}
                </div>
              </th>
              <th className="p-4 text-left text-sm font-medium text-foreground">Contact</th>
              <th 
                className="p-4 text-left text-sm font-medium text-foreground cursor-pointer hover:bg-muted/30"
                onClick={() => handleSort('batch')}
              >
                <div className="flex items-center space-x-1">
                  <span>Batch</span>
                  {getSortIcon('batch')}
                </div>
              </th>
              <th className="p-4 text-left text-sm font-medium text-foreground">Course</th>
              <th 
                className="p-4 text-left text-sm font-medium text-foreground cursor-pointer hover:bg-muted/30"
                onClick={() => handleSort('performance')}
              >
                <div className="flex items-center space-x-1">
                  <span>Performance</span>
                  {getSortIcon('performance')}
                </div>
              </th>
              <th className="p-4 text-left text-sm font-medium text-foreground">Status</th>
              <th className="p-4 text-left text-sm font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students?.map((student) => (
              <React.Fragment key={student?.id}>
                <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedStudents?.includes(student?.id)}
                      onChange={(e) => onSelectStudent(student?.id, e?.target?.checked)}
                      className="rounded border-border"
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <Image
                        src={student?.photo}
                        alt={student?.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleRowExpansion(student?.id)}
                        className="w-6 h-6"
                      >
                        <Icon 
                          name={expandedRows?.has(student?.id) ? "ChevronDown" : "ChevronRight"} 
                          size={14} 
                        />
                      </Button>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-foreground">{student?.name}</p>
                      <p className="text-sm text-muted-foreground">ID: {student?.studentId}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-sm text-foreground">{student?.email}</p>
                      <p className="text-sm text-muted-foreground">{student?.phone}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-foreground">{student?.batch}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-foreground">{student?.course}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getPerformanceColor(student?.averageScore)}`}>
                        {student?.averageScore}%
                      </span>
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            student?.averageScore >= 90 ? 'bg-success' :
                            student?.averageScore >= 75 ? 'bg-primary' :
                            student?.averageScore >= 60 ? 'bg-warning' : 'bg-error'
                          }`}
                          style={{ width: `${student?.averageScore}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(student?.status)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditStudent(student)}
                        title="Edit Student"
                      >
                        <Icon name="Edit" size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewAnalytics(student)}
                        title="View Analytics"
                      >
                        <Icon name="BarChart3" size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onManageBatch(student)}
                        title="Manage Batch"
                      >
                        <Icon name="Users" size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
                
                {/* Expanded Row Details */}
                {expandedRows?.has(student?.id) && (
                  <tr className="bg-muted/20 border-b border-border">
                    <td colSpan="9" className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Personal Details */}
                        <div>
                          <h4 className="font-medium text-foreground mb-3">Personal Details</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Date of Birth:</span>
                              <span className="text-foreground">{student?.dateOfBirth}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Gender:</span>
                              <span className="text-foreground">{student?.gender}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Address:</span>
                              <span className="text-foreground">{student?.address}</span>
                            </div>
                          </div>
                        </div>

                        {/* Parent Details */}
                        <div>
                          <h4 className="font-medium text-foreground mb-3">Parent Information</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Father's Name:</span>
                              <span className="text-foreground">{student?.fatherName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Mother's Name:</span>
                              <span className="text-foreground">{student?.motherName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Parent Phone:</span>
                              <span className="text-foreground">{student?.parentPhone}</span>
                            </div>
                          </div>
                        </div>

                        {/* Academic Performance */}
                        <div>
                          <h4 className="font-medium text-foreground mb-3">Recent Performance</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tests Taken:</span>
                              <span className="text-foreground">{student?.testsTaken}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Last Test Score:</span>
                              <span className={`font-medium ${getPerformanceColor(student?.lastTestScore)}`}>
                                {student?.lastTestScore}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Enrollment Date:</span>
                              <span className="text-foreground">{student?.enrollmentDate}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile Card Layout */}
      <div className="lg:hidden">
        {students?.map((student) => (
          <div key={student?.id} className="p-4 border-b border-border last:border-b-0">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={selectedStudents?.includes(student?.id)}
                onChange={(e) => onSelectStudent(student?.id, e?.target?.checked)}
                className="mt-1 rounded border-border"
              />
              <Image
                src={student?.photo}
                alt={student?.name}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{student?.name}</h3>
                    <p className="text-sm text-muted-foreground">ID: {student?.studentId}</p>
                    <p className="text-sm text-muted-foreground">{student?.email}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getStatusBadge(student?.status)}
                  </div>
                </div>
                
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Batch:</span>
                    <p className="text-foreground">{student?.batch}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Course:</span>
                    <p className="text-foreground">{student?.course}</p>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Performance:</span>
                    <span className={`text-sm font-medium ${getPerformanceColor(student?.averageScore)}`}>
                      {student?.averageScore}%
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditStudent(student)}
                    >
                      <Icon name="Edit" size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewAnalytics(student)}
                    >
                      <Icon name="BarChart3" size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onManageBatch(student)}
                    >
                      <Icon name="Users" size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentTable;