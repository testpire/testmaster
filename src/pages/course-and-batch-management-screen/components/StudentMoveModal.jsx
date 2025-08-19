import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

import { Checkbox } from '../../../components/ui/Checkbox';

const StudentMoveModal = ({ 
  isOpen, 
  onClose, 
  sourceBatch,
  availableBatches = [],
  onMoveStudents 
}) => {
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [targetBatchId, setTargetBatchId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock students data for the source batch
  const students = [
    {
      id: 'S001',
      name: 'Aarav Sharma',
      rollNumber: 'R001',
      email: 'aarav.sharma@email.com',
      joinDate: '2024-01-15',
      performance: 85
    },
    {
      id: 'S002',
      name: 'Diya Patel',
      rollNumber: 'R002',
      email: 'diya.patel@email.com',
      joinDate: '2024-01-16',
      performance: 92
    },
    {
      id: 'S003',
      name: 'Arjun Singh',
      rollNumber: 'R003',
      email: 'arjun.singh@email.com',
      joinDate: '2024-01-17',
      performance: 78
    },
    {
      id: 'S004',
      name: 'Kavya Reddy',
      rollNumber: 'R004',
      email: 'kavya.reddy@email.com',
      joinDate: '2024-01-18',
      performance: 88
    },
    {
      id: 'S005',
      name: 'Rohan Gupta',
      rollNumber: 'R005',
      email: 'rohan.gupta@email.com',
      joinDate: '2024-01-19',
      performance: 76
    }
  ];

  const filteredStudents = students?.filter(student =>
    student?.name?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
    student?.rollNumber?.toLowerCase()?.includes(searchQuery?.toLowerCase())
  );

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedStudents(filteredStudents?.map(student => student?.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (studentId, checked) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev?.filter(id => id !== studentId));
    }
  };

  const handleMove = () => {
    if (selectedStudents?.length > 0 && targetBatchId) {
      const targetBatch = availableBatches?.find(batch => batch?.id === targetBatchId);
      const studentsToMove = students?.filter(student => selectedStudents?.includes(student?.id));
      
      onMoveStudents({
        students: studentsToMove,
        sourceBatch: sourceBatch,
        targetBatch: targetBatch
      });
      
      onClose();
    }
  };

  const getTargetBatchCapacity = () => {
    const targetBatch = availableBatches?.find(batch => batch?.id === targetBatchId);
    if (targetBatch) {
      const availableSpots = targetBatch?.maxCapacity - targetBatch?.currentStudents;
      return {
        available: availableSpots,
        canAccommodate: availableSpots >= selectedStudents?.length
      };
    }
    return { available: 0, canAccommodate: false };
  };

  if (!isOpen) return null;

  const targetCapacity = getTargetBatchCapacity();

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border border-border w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Move Students</h2>
            <p className="text-sm text-muted-foreground mt-1">
              From: {sourceBatch?.name} ({sourceBatch?.batchId})
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        <div className="flex h-[600px]">
          {/* Students List */}
          <div className="flex-1 border-r border-border">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-foreground">Select Students to Move</h3>
                <span className="text-sm text-muted-foreground">
                  {selectedStudents?.length} of {filteredStudents?.length} selected
                </span>
              </div>
              
              <div className="relative">
                <Icon 
                  name="Search" 
                  size={16} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
                />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e?.target?.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-md bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="p-4">
              <div className="mb-3">
                <Checkbox
                  label="Select All"
                  checked={selectedStudents?.length === filteredStudents?.length && filteredStudents?.length > 0}
                  onChange={(e) => handleSelectAll(e?.target?.checked)}
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredStudents?.map(student => (
                  <div key={student?.id} className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <Checkbox
                      checked={selectedStudents?.includes(student?.id)}
                      onChange={(e) => handleSelectStudent(student?.id, e?.target?.checked)}
                    />
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <Icon name="User" size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{student?.name}</p>
                      <p className="text-sm text-muted-foreground">{student?.rollNumber} • {student?.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{student?.performance}%</p>
                      <p className="text-xs text-muted-foreground">Performance</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Target Batch Selection */}
          <div className="w-80">
            <div className="p-4 border-b border-border">
              <h3 className="font-medium text-foreground mb-3">Select Target Batch</h3>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Available Batches
                </label>
                <select
                  value={targetBatchId}
                  onChange={(e) => setTargetBatchId(e?.target?.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Choose a batch</option>
                  {availableBatches?.filter(batch => batch?.id !== sourceBatch?.id)?.map(batch => (
                    <option key={batch?.id} value={batch?.id}>
                      {batch?.name} ({batch?.currentStudents}/{batch?.maxCapacity})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {targetBatchId && (
              <div className="p-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-3">Batch Details</h4>
                  {(() => {
                    const targetBatch = availableBatches?.find(batch => batch?.id === targetBatchId);
                    return targetBatch ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Course:</span>
                          <span className="text-foreground">{targetBatch?.courseName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Teacher:</span>
                          <span className="text-foreground">{targetBatch?.teacherName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Schedule:</span>
                          <span className="text-foreground">{targetBatch?.schedule?.days}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Capacity:</span>
                          <span className="text-foreground">
                            {targetBatch?.currentStudents}/{targetBatch?.maxCapacity}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Available Spots:</span>
                          <span className={`font-medium ${targetCapacity?.canAccommodate ? 'text-success' : 'text-error'}`}>
                            {targetCapacity?.available}
                          </span>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>

                {selectedStudents?.length > 0 && targetBatchId && (
                  <div className="mt-4">
                    {targetCapacity?.canAccommodate ? (
                      <div className="flex items-center space-x-2 text-success">
                        <Icon name="CheckCircle" size={16} />
                        <span className="text-sm">Can accommodate {selectedStudents?.length} student{selectedStudents?.length !== 1 ? 's' : ''}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-error">
                        <Icon name="AlertCircle" size={16} />
                        <span className="text-sm">Not enough capacity for {selectedStudents?.length} student{selectedStudents?.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleMove}
            disabled={selectedStudents?.length === 0 || !targetBatchId || !targetCapacity?.canAccommodate}
          >
            <Icon name="ArrowRightLeft" size={16} />
            <span className="ml-2">Move {selectedStudents?.length} Student{selectedStudents?.length !== 1 ? 's' : ''}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StudentMoveModal;