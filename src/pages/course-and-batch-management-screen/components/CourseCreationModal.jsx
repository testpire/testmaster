import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';

const CourseCreationModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingCourse = null 
}) => {
  const [formData, setFormData] = useState({
    name: editingCourse?.name || '',
    description: editingCourse?.description || '',
    subjects: editingCourse?.subjects || [],
    difficultyLevel: editingCourse?.difficultyLevel || 'Moderate',
    curriculum: editingCourse?.curriculum || 'CBSE',
    duration: editingCourse?.duration || '',
    maxStudents: editingCourse?.maxStudents || ''
  });

  const [errors, setErrors] = useState({});

  const availableSubjects = [
    'Physics', 'Chemistry', 'Mathematics', 'Biology', 
    'English', 'Hindi', 'Computer Science', 'Economics'
  ];

  const curriculumOptions = ['CBSE', 'ICSE', 'State Board', 'JEE', 'NEET', 'UPSC', 'SSC'];
  const difficultyLevels = ['Easy', 'Moderate', 'Tough'];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors?.[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubjectToggle = (subject, checked) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        subjects: [...prev?.subjects, subject]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        subjects: prev?.subjects?.filter(s => s !== subject)
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData?.name?.trim()) {
      newErrors.name = 'Course name is required';
    }
    
    if (formData?.subjects?.length === 0) {
      newErrors.subjects = 'At least one subject must be selected';
    }
    
    if (!formData?.duration?.trim()) {
      newErrors.duration = 'Duration is required';
    }
    
    if (!formData?.maxStudents || formData?.maxStudents < 1) {
      newErrors.maxStudents = 'Valid maximum students count is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave({
        ...formData,
        id: editingCourse?.id || Date.now(),
        createdAt: editingCourse?.createdAt || new Date()?.toISOString(),
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
            {editingCourse ? 'Edit Course' : 'Create New Course'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Course Name"
              type="text"
              placeholder="Enter course name"
              value={formData?.name}
              onChange={(e) => handleInputChange('name', e?.target?.value)}
              error={errors?.name}
              required
            />
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Curriculum
              </label>
              <select
                value={formData?.curriculum}
                onChange={(e) => handleInputChange('curriculum', e?.target?.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {curriculumOptions?.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Description"
            type="text"
            placeholder="Enter course description"
            value={formData?.description}
            onChange={(e) => handleInputChange('description', e?.target?.value)}
          />

          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Subjects <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableSubjects?.map(subject => (
                <Checkbox
                  key={subject}
                  label={subject}
                  checked={formData?.subjects?.includes(subject)}
                  onChange={(e) => handleSubjectToggle(subject, e?.target?.checked)}
                />
              ))}
            </div>
            {errors?.subjects && (
              <p className="text-sm text-error mt-1">{errors?.subjects}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Difficulty Level
              </label>
              <select
                value={formData?.difficultyLevel}
                onChange={(e) => handleInputChange('difficultyLevel', e?.target?.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {difficultyLevels?.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <Input
              label="Duration"
              type="text"
              placeholder="e.g., 6 months"
              value={formData?.duration}
              onChange={(e) => handleInputChange('duration', e?.target?.value)}
              error={errors?.duration}
              required
            />

            <Input
              label="Max Students"
              type="number"
              placeholder="Enter maximum students"
              value={formData?.maxStudents}
              onChange={(e) => handleInputChange('maxStudents', e?.target?.value)}
              error={errors?.maxStudents}
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Icon name="Save" size={16} />
            <span className="ml-2">{editingCourse ? 'Update Course' : 'Create Course'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CourseCreationModal;