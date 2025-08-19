import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const BatchTable = ({ 
  batches, 
  onEdit, 
  onViewStudents, 
  onDelete,
  onMoveStudents 
}) => {
  const [selectedBatches, setSelectedBatches] = useState([]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedBatches(batches?.map(batch => batch?.id));
    } else {
      setSelectedBatches([]);
    }
  };

  const handleSelectBatch = (batchId, checked) => {
    if (checked) {
      setSelectedBatches(prev => [...prev, batchId]);
    } else {
      setSelectedBatches(prev => prev?.filter(id => id !== batchId));
    }
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'Active': 'text-success bg-success/10',
      'Inactive': 'text-muted-foreground bg-muted',
      'Full': 'text-warning bg-warning/10'
    };
    return colorMap?.[status] || 'text-muted-foreground bg-muted';
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left p-4 font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={selectedBatches?.length === batches?.length}
                  onChange={(e) => handleSelectAll(e?.target?.checked)}
                  className="rounded border-border"
                />
              </th>
              <th className="text-left p-4 font-medium text-foreground">Batch Name</th>
              <th className="text-left p-4 font-medium text-foreground">Course</th>
              <th className="text-left p-4 font-medium text-foreground">Students</th>
              <th className="text-left p-4 font-medium text-foreground">Teacher</th>
              <th className="text-left p-4 font-medium text-foreground">Schedule</th>
              <th className="text-left p-4 font-medium text-foreground">Status</th>
              <th className="text-left p-4 font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {batches?.map((batch) => (
              <tr key={batch?.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={selectedBatches?.includes(batch?.id)}
                    onChange={(e) => handleSelectBatch(batch?.id, e?.target?.checked)}
                    className="rounded border-border"
                  />
                </td>
                <td className="p-4">
                  <div>
                    <p className="font-medium text-foreground">{batch?.name}</p>
                    <p className="text-sm text-muted-foreground">ID: {batch?.batchId}</p>
                  </div>
                </td>
                <td className="p-4">
                  <div>
                    <p className="font-medium text-foreground">{batch?.courseName}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {batch?.subjects?.slice(0, 2)?.map((subject, index) => (
                        <span key={index} className="text-xs bg-muted px-2 py-1 rounded">
                          {subject}
                        </span>
                      ))}
                      {batch?.subjects?.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{batch?.subjects?.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <Icon name="Users" size={16} className="text-muted-foreground" />
                    <span className="text-foreground">
                      {batch?.currentStudents}/{batch?.maxCapacity}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-1">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(batch?.currentStudents / batch?.maxCapacity) * 100}%` }}
                    ></div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <Icon name="User" size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{batch?.teacherName}</p>
                      <p className="text-xs text-muted-foreground">{batch?.teacherId}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{batch?.schedule?.days}</p>
                    <p className="text-xs text-muted-foreground">{batch?.schedule?.time}</p>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(batch?.status)}`}>
                    {batch?.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewStudents(batch)}
                      className="h-8 w-8"
                    >
                      <Icon name="Eye" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(batch)}
                      className="h-8 w-8"
                    >
                      <Icon name="Edit2" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onMoveStudents(batch)}
                      className="h-8 w-8"
                    >
                      <Icon name="ArrowRightLeft" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(batch)}
                      className="h-8 w-8 text-error hover:text-error"
                    >
                      <Icon name="Trash2" size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedBatches?.length > 0 && (
        <div className="bg-muted/50 border-t border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">
              {selectedBatches?.length} batch{selectedBatches?.length !== 1 ? 'es' : ''} selected
            </span>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Icon name="Download" size={14} />
                <span className="ml-1">Export</span>
              </Button>
              <Button variant="outline" size="sm">
                <Icon name="ArrowRightLeft" size={14} />
                <span className="ml-1">Bulk Move</span>
              </Button>
              <Button variant="destructive" size="sm">
                <Icon name="Trash2" size={14} />
                <span className="ml-1">Delete</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchTable;