import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

const CourseModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editMode = false, 
  existingCourse = null,
  instituteId 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    prerequisites: '',
    instituteId: instituteId || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update form data when editing
  useEffect(() => {
    if (editMode && existingCourse) {
      setFormData({
        name: existingCourse.name || '',
        description: existingCourse.description || '',
        code: existingCourse.code || '',
        prerequisites: existingCourse.prerequisites || '',
        instituteId: existingCourse.instituteId || instituteId || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        code: '',
        prerequisites: '',
        instituteId: instituteId || ''
      });
    }
  }, [editMode, existingCourse, instituteId, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!formData.name.trim() || !formData.code.trim()) {
      setError('Name and code are required');
      setLoading(false);
      return;
    }

    try {
      const courseData = {
        name: formData.name,
        description: formData.description,
        code: formData.code,
        prerequisites: formData.prerequisites,
        instituteId: parseInt(formData.instituteId)
      };

      if (onSuccess) {
        await onSuccess(courseData, editMode ? existingCourse.id : null);
      }
      
      onClose();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(`An unexpected error occurred: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editMode ? 'Edit Course' : 'Add Course'}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Course Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Course Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g., Computer Science Engineering"
              disabled={loading}
              maxLength={100}
            />
          </div>

          {/* Course Code */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Course Code *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g., CSE"
              disabled={loading}
              maxLength={20}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-vertical"
              rows={3}
              placeholder="Course description..."
              disabled={loading}
              maxLength={1000}
            />
          </div>

          {/* Prerequisites */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Prerequisites
            </label>
            <textarea
              value={formData.prerequisites}
              onChange={(e) => handleInputChange('prerequisites', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-vertical"
              rows={2}
              placeholder="Course prerequisites..."
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

        {/* Footer — kept inside <form> so type="submit" works */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-border">
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
          >
            {loading ? 'Saving...' : editMode ? 'Update Course' : 'Create Course'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CourseModal;
