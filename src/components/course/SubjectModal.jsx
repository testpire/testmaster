import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

const SubjectModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editMode = false, 
  existingSubject = null,
  instituteId,
  courses = []
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    courseId: '',
    duration: '',
    prerequisites: '',
    instituteId: instituteId || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update form data when editing
  useEffect(() => {
    if (editMode && existingSubject) {
      setFormData({
        name: existingSubject.name || '',
        description: existingSubject.description || '',
        code: existingSubject.code || '',
        courseId: existingSubject.courseId || '',
        duration: existingSubject.duration || '',
        prerequisites: existingSubject.prerequisites || '',
        instituteId: existingSubject.instituteId || instituteId || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        code: '',
        courseId: '',
        duration: '',
        prerequisites: '',
        instituteId: instituteId || ''
      });
    }
  }, [editMode, existingSubject, instituteId, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!formData.name.trim() || !formData.code.trim() || !formData.courseId) {
      setError('Name, code, and course are required');
      setLoading(false);
      return;
    }

    try {
      const subjectData = {
        name: formData.name,
        description: formData.description,
        code: formData.code,
        courseId: parseInt(formData.courseId),
        duration: formData.duration,
        prerequisites: formData.prerequisites,
        instituteId: parseInt(formData.instituteId)
      };

      if (onSuccess) {
        await onSuccess(subjectData, editMode ? existingSubject.id : null);
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
      title={editMode ? 'Edit Subject' : 'Add Subject'}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Course Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Course *
            </label>
            <select
              value={formData.courseId}
              onChange={(e) => handleInputChange('courseId', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
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

          {/* Subject Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Subject Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g., Data Structures and Algorithms"
              disabled={loading}
              maxLength={100}
            />
          </div>

          {/* Subject Code */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Subject Code *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g., DSA101"
              disabled={loading}
              maxLength={20}
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Duration
            </label>
            <input
              type="text"
              value={formData.duration}
              onChange={(e) => handleInputChange('duration', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g., 1 semester"
              disabled={loading}
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
              placeholder="Subject description..."
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
              placeholder="Subject prerequisites..."
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
            {loading ? 'Saving...' : editMode ? 'Update Subject' : 'Create Subject'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SubjectModal;
