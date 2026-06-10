import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

const TopicModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editMode = false, 
  existingTopic = null,
  instituteId,
  courses = [],
  subjects = [],
  chapters = [],
  onCourseChange,
  onSubjectChange
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    chapterId: '',
    subjectId: '',
    courseId: '',
    orderIndex: 1,
    duration: '',
    content: '',
    learningOutcomes: '',
    instituteId: instituteId || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [filteredChapters, setFilteredChapters] = useState([]);

  // Update filtered subjects when course changes
  useEffect(() => {
    if (formData.courseId) {
      const courseSubjects = subjects.filter(subject => subject.courseId === parseInt(formData.courseId));
      setFilteredSubjects(courseSubjects);
    } else {
      setFilteredSubjects([]);
    }
  }, [formData.courseId, subjects]);

  // Update filtered chapters when subject changes
  useEffect(() => {
    if (formData.subjectId) {
      const subjectChapters = chapters.filter(chapter => chapter.subjectId === parseInt(formData.subjectId));
      setFilteredChapters(subjectChapters);
    } else {
      setFilteredChapters([]);
    }
  }, [formData.subjectId, chapters]);

  // Update form data when editing
  useEffect(() => {
    if (editMode && existingTopic) {
      setFormData({
        name: existingTopic.name || '',
        description: existingTopic.description || '',
        code: existingTopic.code || '',
        chapterId: existingTopic.chapterId || '',
        subjectId: existingTopic.subjectId || '',
        courseId: existingTopic.courseId || '',
        orderIndex: existingTopic.orderIndex || 1,
        duration: existingTopic.duration || '',
        content: existingTopic.content || '',
        learningOutcomes: existingTopic.learningOutcomes || '',
        instituteId: existingTopic.instituteId || instituteId || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        code: '',
        chapterId: '',
        subjectId: '',
        courseId: '',
        orderIndex: 1,
        duration: '',
        content: '',
        learningOutcomes: '',
        instituteId: instituteId || ''
      });
    }
  }, [editMode, existingTopic, instituteId, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');

    // Reset dependent fields when parent changes
    if (field === 'courseId') {
      setFormData(prev => ({ ...prev, [field]: value, subjectId: '', chapterId: '' }));
      if (onCourseChange) {
        onCourseChange(value);
      }
    } else if (field === 'subjectId') {
      setFormData(prev => ({ ...prev, [field]: value, chapterId: '' }));
      if (onSubjectChange) {
        onSubjectChange(value);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!formData.name.trim() || !formData.code.trim() || !formData.chapterId) {
      setError('Name, code, and chapter are required');
      setLoading(false);
      return;
    }

    try {
      const topicData = {
        name: formData.name,
        description: formData.description,
        code: formData.code,
        chapterId: parseInt(formData.chapterId),
        orderIndex: parseInt(formData.orderIndex) || 1,
        duration: formData.duration,
        content: formData.content,
        learningOutcomes: formData.learningOutcomes,
        instituteId: parseInt(formData.instituteId)
      };

      if (onSuccess) {
        await onSuccess(topicData, editMode ? existingTopic.id : null);
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
      title={editMode ? 'Edit Topic' : 'Add Topic'}
      size="lg"
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

          {/* Subject Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Subject *
            </label>
            <select
              value={formData.subjectId}
              onChange={(e) => handleInputChange('subjectId', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
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

          {/* Chapter Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Chapter *
            </label>
            <select
              value={formData.chapterId}
              onChange={(e) => handleInputChange('chapterId', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading || !formData.subjectId}
            >
              <option value="">
                {formData.subjectId ? 'Select a chapter' : 'Select a subject first'}
              </option>
              {filteredChapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name} ({chapter.code})
                </option>
              ))}
            </select>
          </div>

          {/* Topic Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Topic Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g., Linear Search Algorithm"
              disabled={loading}
              maxLength={100}
            />
          </div>

          {/* Topic Code and Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Topic Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., T01"
                disabled={loading}
                maxLength={20}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Order
              </label>
              <input
                type="number"
                value={formData.orderIndex}
                onChange={(e) => handleInputChange('orderIndex', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="1"
                min="1"
                disabled={loading}
              />
            </div>
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
              placeholder="e.g., 2 hours"
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
              rows={2}
              placeholder="Topic description..."
              disabled={loading}
              maxLength={1000}
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Content
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-vertical"
              rows={3}
              placeholder="Detailed content for this topic..."
              disabled={loading}
            />
          </div>

          {/* Learning Outcomes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Learning Outcomes
            </label>
            <textarea
              value={formData.learningOutcomes}
              onChange={(e) => handleInputChange('learningOutcomes', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-vertical"
              rows={2}
              placeholder="What students will achieve after studying this topic..."
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
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading ? 'Saving...' : editMode ? 'Update Topic' : 'Create Topic'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TopicModal;
