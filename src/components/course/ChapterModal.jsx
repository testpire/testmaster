import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Icon from '../AppIcon';

const ChapterModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editMode = false, 
  existingChapter = null,
  instituteId,
  courses = [],
  subjects = [],
  onCourseChange
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    subjectId: '',
    courseId: '',
    orderIndex: 1,
    duration: '',
    objectives: '',
    instituteId: instituteId || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filteredSubjects, setFilteredSubjects] = useState([]);

  // Update filtered subjects when course changes
  useEffect(() => {
    if (formData.courseId) {
      const courseSubjects = subjects.filter(subject => subject.courseId === parseInt(formData.courseId));
      setFilteredSubjects(courseSubjects);
    } else {
      setFilteredSubjects([]);
    }
  }, [formData.courseId, subjects]);

  // Update form data when editing
  useEffect(() => {
    if (editMode && existingChapter) {
      setFormData({
        name: existingChapter.name || '',
        description: existingChapter.description || '',
        code: existingChapter.code || '',
        subjectId: existingChapter.subjectId || '',
        courseId: existingChapter.courseId || '',
        orderIndex: existingChapter.orderIndex || 1,
        duration: existingChapter.duration || '',
        objectives: existingChapter.objectives || '',
        instituteId: existingChapter.instituteId || instituteId || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        code: '',
        subjectId: '',
        courseId: '',
        orderIndex: 1,
        duration: '',
        objectives: '',
        instituteId: instituteId || ''
      });
    }
  }, [editMode, existingChapter, instituteId, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');

    // Reset subject when course changes
    if (field === 'courseId') {
      setFormData(prev => ({ ...prev, [field]: value, subjectId: '' }));
      if (onCourseChange) {
        onCourseChange(value);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!formData.name.trim() || !formData.code.trim() || !formData.subjectId) {
      setError('Name, code, and subject are required');
      setLoading(false);
      return;
    }

    try {
      const chapterData = {
        name: formData.name,
        description: formData.description,
        code: formData.code,
        subjectId: parseInt(formData.subjectId),
        orderIndex: parseInt(formData.orderIndex) || 1,
        duration: formData.duration,
        objectives: formData.objectives,
        instituteId: parseInt(formData.instituteId)
      };

      if (onSuccess) {
        await onSuccess(chapterData, editMode ? existingChapter.id : null);
      }
      
      onClose();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(`An unexpected error occurred: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editMode ? 'Edit Chapter' : 'Add Chapter'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={loading}
          >
            <Icon name="X" size={20} />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Course Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course *
              </label>
              <select
                value={formData.courseId}
                onChange={(e) => handleInputChange('courseId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <select
                value={formData.subjectId}
                onChange={(e) => handleInputChange('subjectId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading || !formData.courseId}
              >
                <option value="">
                  {formData.courseId ? 'Select a subject' : 'Select a course first'}
                </option>
                {filteredSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Chapter Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chapter Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Introduction to Arrays"
                disabled={loading}
                maxLength={100}
              />
            </div>

            {/* Chapter Code and Order */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chapter Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., CH01"
                  disabled={loading}
                  maxLength={20}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order
                </label>
                <input
                  type="number"
                  value={formData.orderIndex}
                  onChange={(e) => handleInputChange('orderIndex', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1"
                  min="1"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration
              </label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 2 weeks"
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                rows={2}
                placeholder="Chapter description..."
                disabled={loading}
                maxLength={1000}
              />
            </div>

            {/* Objectives */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Learning Objectives
              </label>
              <textarea
                value={formData.objectives}
                onChange={(e) => handleInputChange('objectives', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                rows={2}
                placeholder="What students will learn in this chapter..."
                disabled={loading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? 'Saving...' : editMode ? 'Update Chapter' : 'Create Chapter'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChapterModal;
