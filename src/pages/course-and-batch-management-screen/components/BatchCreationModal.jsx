import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const BatchCreationModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingBatch = null,
  availableCourses = [],
  availableTeachers = []
}) => {
  const [formData, setFormData] = useState({
    name: editingBatch?.name || '',
    courseId: editingBatch?.courseId || '',
    teacherId: editingBatch?.teacherId || '',
    maxCapacity: editingBatch?.maxCapacity || '',
    schedule: {
      days: editingBatch?.schedule?.days || '',
      time: editingBatch?.schedule?.time || '',
      duration: editingBatch?.schedule?.duration || ''
    },
    startDate: editingBatch?.startDate || '',
    endDate: editingBatch?.endDate || '',
    description: editingBatch?.description || ''
  });

  const [errors, setErrors] = useState({});
  const [teacherConflicts, setTeacherConflicts] = useState([]);

  const handleInputChange = (field, value) => {
    if (field?.includes('.')) {
      const [parent, child] = field?.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev?.[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    if (errors?.[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const checkTeacherConflicts = (teacherId, schedule) => {
    // Mock conflict detection
    const conflicts = [];
    if (teacherId === 'T001' && schedule?.days === 'Mon, Wed, Fri') {
      conflicts?.push('Teacher has another batch at the same time on Monday');
    }
    setTeacherConflicts(conflicts);
  };

  const handleTeacherChange = (teacherId) => {
    handleInputChange('teacherId', teacherId);
    checkTeacherConflicts(teacherId, formData?.schedule);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData?.name?.trim()) {
      newErrors.name = 'Batch name is required';
    }
    
    if (!formData?.courseId) {
      newErrors.courseId = 'Course selection is required';
    }
    
    if (!formData?.teacherId) {
      newErrors.teacherId = 'Teacher assignment is required';
    }
    
    if (!formData?.maxCapacity || formData?.maxCapacity < 1) {
      newErrors.maxCapacity = 'Valid capacity is required';
    }
    
    if (!formData?.schedule?.days) {
      newErrors['schedule.days'] = 'Schedule days are required';
    }
    
    if (!formData?.schedule?.time) {
      newErrors['schedule.time'] = 'Schedule time is required';
    }
    
    if (!formData?.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0 && teacherConflicts?.length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      const selectedCourse = availableCourses?.find(c => c?.id === formData?.courseId);
      const selectedTeacher = availableTeachers?.find(t => t?.id === formData?.teacherId);
      
      onSave({
        ...formData,
        id: editingBatch?.id || Date.now(),
        batchId: editingBatch?.batchId || `B${Date.now()?.toString()?.slice(-6)}`,
        courseName: selectedCourse?.name || '',
        subjects: selectedCourse?.subjects || [],
        teacherName: selectedTeacher?.name || '',
        currentStudents: editingBatch?.currentStudents || 0,
        status: editingBatch?.status || 'Active',
        createdAt: editingBatch?.createdAt || new Date()?.toISOString(),
        updatedAt: new Date()?.toISOString()
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            {editingBatch ? 'Edit Batch' : 'Create New Batch'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Batch Name"
              type="text"
              placeholder="Enter batch name"
              value={formData?.name}
              onChange={(e) => handleInputChange('name', e?.target?.value)}
              error={errors?.name}
              required
            />
            
            <Input
              label="Maximum Capacity"
              type="number"
              placeholder="Enter max students"
              value={formData?.maxCapacity}
              onChange={(e) => handleInputChange('maxCapacity', e?.target?.value)}
              error={errors?.maxCapacity}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Course <span className="text-error">*</span>
              </label>
              <select
                value={formData?.courseId}
                onChange={(e) => handleInputChange('courseId', e?.target?.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a course</option>
                {availableCourses?.map(course => (
                  <option key={course?.id} value={course?.id}>
                    {course?.name} ({course?.subjects?.join(', ')})
                  </option>
                ))}
              </select>
              {errors?.courseId && (
                <p className="text-sm text-error mt-1">{errors?.courseId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Assigned Teacher <span className="text-error">*</span>
              </label>
              <select
                value={formData?.teacherId}
                onChange={(e) => handleTeacherChange(e?.target?.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a teacher</option>
                {availableTeachers?.map(teacher => (
                  <option key={teacher?.id} value={teacher?.id}>
                    {teacher?.name} - {teacher?.subjects?.join(', ')}
                  </option>
                ))}
              </select>
              {errors?.teacherId && (
                <p className="text-sm text-error mt-1">{errors?.teacherId}</p>
              )}
              {teacherConflicts?.length > 0 && (
                <div className="mt-2 p-2 bg-warning/10 border border-warning/20 rounded-md">
                  <div className="flex items-start space-x-2">
                    <Icon name="AlertTriangle" size={16} className="text-warning mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-warning">Schedule Conflicts:</p>
                      {teacherConflicts?.map((conflict, index) => (
                        <p key={index} className="text-xs text-warning mt-1">{conflict}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Schedule Days"
              type="text"
              placeholder="e.g., Mon, Wed, Fri"
              value={formData?.schedule?.days}
              onChange={(e) => handleInputChange('schedule.days', e?.target?.value)}
              error={errors?.['schedule.days']}
              required
            />
            
            <Input
              label="Schedule Time"
              type="text"
              placeholder="e.g., 10:00 AM - 12:00 PM"
              value={formData?.schedule?.time}
              onChange={(e) => handleInputChange('schedule.time', e?.target?.value)}
              error={errors?.['schedule.time']}
              required
            />
            
            <Input
              label="Duration per Session"
              type="text"
              placeholder="e.g., 2 hours"
              value={formData?.schedule?.duration}
              onChange={(e) => handleInputChange('schedule.duration', e?.target?.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={formData?.startDate}
              onChange={(e) => handleInputChange('startDate', e?.target?.value)}
              error={errors?.startDate}
              required
            />
            
            <Input
              label="End Date"
              type="date"
              value={formData?.endDate}
              onChange={(e) => handleInputChange('endDate', e?.target?.value)}
            />
          </div>

          <Input
            label="Description"
            type="text"
            placeholder="Enter batch description (optional)"
            value={formData?.description}
            onChange={(e) => handleInputChange('description', e?.target?.value)}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={teacherConflicts?.length > 0}>
            <Icon name="Save" size={16} />
            <span className="ml-2">{editingBatch ? 'Update Batch' : 'Create Batch'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BatchCreationModal;