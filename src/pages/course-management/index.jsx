import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { courseService } from '../../services/courseService';
import { newInstituteService } from '../../services/newInstituteService';
import PageLayout from '../../components/layout/PageLayout';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
// Inline Modal Components
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon name="X" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const CourseModal = ({ isOpen, onClose, course, onSubmit, courses, currentUser }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    level: 'Undergraduate',
    duration: '4'
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (course) {
      setFormData({
        name: course.name || '',
        code: course.code || '',
        description: course.description || '',
        level: course.level || 'Undergraduate',
        duration: course.duration || '4'
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        level: 'Undergraduate',
        duration: '4'
      });
    }
  }, [course]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      alert('Name and Code are required');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        instituteId: currentUser?.instituteId
      }, course?.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={course ? 'Edit Course' : 'Add Course'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Course Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Computer Science"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Course Code *
          </label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., CSE01"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Level
          </label>
          <select
            value={formData.level}
            onChange={(e) => setFormData({ ...formData, level: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Undergraduate">Undergraduate</option>
            <option value="Graduate">Graduate</option>
            <option value="Postgraduate">Postgraduate</option>
            <option value="Diploma">Diploma</option>
            <option value="Certificate">Certificate</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (Years)
          </label>
          <input
            type="text"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 4"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Course description..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : course ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const SubjectModal = ({ isOpen, onClose, subject, onSubmit, courses, currentUser }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    courseId: '',
    credits: 3,
    duration: '1 Semester'
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subject) {
      setFormData({
        name: subject.name || '',
        code: subject.code || '',
        description: subject.description || '',
        courseId: subject.courseId || '',
        credits: subject.credits || 3,
        duration: subject.duration || '1 Semester'
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        courseId: courses.length > 0 ? courses[0].id : '',
        credits: 3,
        duration: '1 Semester'
      });
    }
  }, [subject, courses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim() || !formData.courseId) {
      alert('Name, Code, and Course are required');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        courseId: parseInt(formData.courseId),
        credits: parseInt(formData.credits),
        instituteId: currentUser?.instituteId
      }, subject?.id);
    } finally {
      setLoading(false);
    }
  };

  if (courses.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Add Subject">
        <div className="text-center py-4">
          <Icon name="AlertCircle" size={48} className="mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Courses Available</h3>
          <p className="text-gray-600 mb-4">You need to create at least one course before adding subjects.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            OK
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={subject ? 'Edit Subject' : 'Add Subject'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Data Structures"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject Code *
          </label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., CS101"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Course *
          </label>
          <select
            value={formData.courseId}
            onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a course</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.name} ({course.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Credits
          </label>
          <input
            type="number"
            value={formData.credits}
            onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration
          </label>
          <input
            type="text"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 1 Semester"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Subject description..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : subject ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const ChapterModal = ({ isOpen, onClose, chapter, onSubmit, subjects, currentUser }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    subjectId: '',
    duration: '1 Week',
    order: 1
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (chapter) {
      setFormData({
        name: chapter.name || '',
        code: chapter.code || '',
        description: chapter.description || '',
        subjectId: chapter.subjectId || '',
        duration: chapter.duration || '1 Week',
        order: chapter.order || 1
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        subjectId: subjects.length > 0 ? subjects[0].id : '',
        duration: '1 Week',
        order: 1
      });
    }
  }, [chapter, subjects]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.subjectId) return;

    setLoading(true);
    const chapterData = {
      ...formData,
      instituteId: currentUser?.instituteId,
      order: parseInt(formData.order)
    };

    await onSubmit(chapterData, chapter?.id);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={chapter ? 'Edit Chapter' : 'Add Chapter'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chapter Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter chapter name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chapter Code
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., CH01"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject *
            </label>
            <select
              value={formData.subjectId}
              onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration
            </label>
            <input
              type="text"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 1 Week"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Chapter description..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : chapter ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const TopicModal = ({ isOpen, onClose, topic, onSubmit, subjects, chapters, currentUser }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    subjectId: '',
    chapterId: '',
    duration: '2 Days',
    order: 1
  });

  const [filteredChapters, setFilteredChapters] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (topic) {
      setFormData({
        name: topic.name || '',
        code: topic.code || '',
        description: topic.description || '',
        subjectId: topic.subjectId || '',
        chapterId: topic.chapterId || '',
        duration: topic.duration || '2 Days',
        order: topic.order || 1
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        subjectId: subjects.length > 0 ? subjects[0].id : '',
        chapterId: '',
        duration: '2 Days',
        order: 1
      });
    }
  }, [topic, subjects]);

  useEffect(() => {
    if (formData.subjectId) {
      const filtered = chapters.filter(ch => ch.subjectId == formData.subjectId);
      setFilteredChapters(filtered);
      // Reset chapter if it doesn't belong to selected subject
      if (formData.chapterId && !filtered.find(ch => ch.id == formData.chapterId)) {
        setFormData(prev => ({ ...prev, chapterId: '' }));
      }
    } else {
      setFilteredChapters([]);
    }
  }, [formData.subjectId, chapters]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.subjectId) return;

    setLoading(true);
    const topicData = {
      ...formData,
      instituteId: currentUser?.instituteId,
      order: parseInt(formData.order)
    };

    await onSubmit(topicData, topic?.id);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={topic ? 'Edit Topic' : 'Add Topic'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter topic name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic Code
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., T01"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject *
            </label>
            <select
              value={formData.subjectId}
              onChange={(e) => setFormData({ ...formData, subjectId: e.target.value, chapterId: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chapter
            </label>
            <select
              value={formData.chapterId}
              onChange={(e) => setFormData({ ...formData, chapterId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!formData.subjectId}
            >
              <option value="">Select Chapter (Optional)</option>
              {filteredChapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name} ({chapter.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration
          </label>
          <input
            type="text"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 2 Days"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Topic description..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : topic ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const CourseManagement = () => {
  const { user, userProfile } = useAuth();
  const currentUser = userProfile || user;

  // State management
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('courses');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Institute data
  const [instituteData, setInstituteData] = useState({
    institute: null,
    loading: true,
    error: null
  });

  // Modal states
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [editingChapter, setEditingChapter] = useState(null);
  const [editingTopic, setEditingTopic] = useState(null);

  // Safe user check
  const safeCurrentUser = currentUser || {};

  // Load institute data
  const loadInstituteData = async () => {
    if (!safeCurrentUser.instituteId) return;
    
    try {
      setInstituteData(prev => ({ ...prev, loading: true }));
      const result = await newInstituteService.getInstituteById(safeCurrentUser.instituteId);
      if (result.data) {
        setInstituteData({ institute: result.data, loading: false, error: null });
      } else {
        setInstituteData(prev => ({ ...prev, loading: false, error: 'Institute not found' }));
      }
    } catch (err) {
      console.error('Error loading institute:', err);
      setInstituteData(prev => ({ ...prev, error: err.message, loading: false }));
    }
  };

  // Load functions with error handling
  const loadCourses = useCallback(async () => {
    try {
      const result = await courseService.getCourses(safeCurrentUser?.instituteId);
      const { data } = result || {};
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading courses:', err);
      setCourses([]);
    }
  }, [safeCurrentUser?.instituteId]);

  const loadSubjects = useCallback(async (courseId = null) => {
    try {
      const result = await courseService.getSubjects(courseId);
      const { data } = result || {};
      setSubjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading subjects:', err);
      setSubjects([]);
    }
  }, [safeCurrentUser?.instituteId]);

  const loadChapters = useCallback(async (subjectId = null) => {
    try {
      const result = await courseService.getChapters(subjectId);
      const { data } = result || {};
      setChapters(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading chapters:', err);
      setChapters([]);
    }
  }, [safeCurrentUser?.instituteId]);

  const loadTopics = useCallback(async (chapterId = null) => {
    try {
      const result = await courseService.getTopics(chapterId);
      const { data } = result || {};
      setTopics(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading topics:', err);
      setTopics([]);
    }
  }, [safeCurrentUser?.instituteId]);

  // Combined load function
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        loadCourses(),
        loadSubjects(),
        loadChapters(),
        loadTopics()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load some data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [loadCourses, loadSubjects, loadChapters, loadTopics]);

  // Initial data load
  useEffect(() => {
    const initializeData = async () => {
      if (user || userProfile) {
        await loadInstituteData();
        await loadAllData();
      }
    };

    initializeData();
  }, [user, userProfile, loadAllData]);

  // Course CRUD operations
  const handleCourseSuccess = async (courseData, courseId = null) => {
    try {
      let result;
      if (courseId) {
        result = await courseService.updateCourse(courseId, courseData);
      } else {
        result = await courseService.createCourse(courseData);
      }
      
      if (result.error) {
        alert(`Failed to ${courseId ? 'update' : 'create'} course: ${result.error}`);
        return;
      }
      
      setShowCourseModal(false);
      setEditingCourse(null);
      await loadCourses();
    } catch (err) {
      console.error('Course operation error:', err);
      alert(`An error occurred: ${err.message}`);
    }
  };

  const handleSubjectSuccess = async (subjectData, subjectId = null) => {
    try {
      let result;
      if (subjectId) {
        result = await courseService.updateSubject(subjectId, subjectData);
      } else {
        result = await courseService.createSubject(subjectData);
      }
      
      if (result.error) {
        alert(`Failed to ${subjectId ? 'update' : 'create'} subject: ${result.error}`);
        return;
      }
      
      setShowSubjectModal(false);
      setEditingSubject(null);
      await loadSubjects();
    } catch (err) {
      console.error('Subject operation error:', err);
      alert(`An error occurred: ${err.message}`);
    }
  };

  const handleChapterSuccess = async (chapterData, chapterId = null) => {
    try {
      let result;
      if (chapterId) {
        result = await courseService.updateChapter(chapterId, chapterData);
      } else {
        result = await courseService.createChapter(chapterData);
      }
      
      if (result.error) {
        alert(`Failed to ${chapterId ? 'update' : 'create'} chapter: ${result.error}`);
        return;
      }
      
      setShowChapterModal(false);
      setEditingChapter(null);
      await loadChapters();
    } catch (err) {
      console.error('Chapter operation error:', err);
      alert(`An error occurred: ${err.message}`);
    }
  };

  const handleTopicSuccess = async (topicData, topicId = null) => {
    try {
      let result;
      if (topicId) {
        result = await courseService.updateTopic(topicId, topicData);
      } else {
        result = await courseService.createTopic(topicData);
      }
      
      if (result.error) {
        alert(`Failed to ${topicId ? 'update' : 'create'} topic: ${result.error}`);
        return;
      }
      
      setShowTopicModal(false);
      setEditingTopic(null);
      await loadTopics();
    } catch (err) {
      console.error('Topic operation error:', err);
      alert(`An error occurred: ${err.message}`);
    }
  };

  // Edit handlers
  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setShowCourseModal(true);
  };

  const handleEditSubject = (subject) => {
    setEditingSubject(subject);
    setShowSubjectModal(true);
  };

  const handleEditChapter = (chapter) => {
    setEditingChapter(chapter);
    setShowChapterModal(true);
  };

  const handleEditTopic = (topic) => {
    setEditingTopic(topic);
    setShowTopicModal(true);
  };

  // Delete handlers
  const handleDeleteCourse = async (courseId) => {
    if (confirm('Are you sure you want to delete this course?')) {
      try {
        const result = await courseService.deleteCourse(courseId);
        if (result.error) {
          alert('Failed to delete course: ' + result.error);
        } else {
          await loadCourses();
        }
      } catch (err) {
        console.error('Error deleting course:', err);
        alert('An error occurred while deleting the course');
      }
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (confirm('Are you sure you want to delete this subject?')) {
      try {
        const result = await courseService.deleteSubject(subjectId);
        if (result.error) {
          alert('Failed to delete subject: ' + result.error);
        } else {
          await loadSubjects();
        }
      } catch (err) {
        console.error('Error deleting subject:', err);
        alert('An error occurred while deleting the subject');
      }
    }
  };

  const handleDeleteChapter = async (chapterId) => {
    if (confirm('Are you sure you want to delete this chapter?')) {
      try {
        const result = await courseService.deleteChapter(chapterId);
        if (result.error) {
          alert('Failed to delete chapter: ' + result.error);
        } else {
          await loadChapters();
        }
      } catch (err) {
        console.error('Error deleting chapter:', err);
        alert('An error occurred while deleting the chapter');
      }
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (confirm('Are you sure you want to delete this topic?')) {
      try {
        const result = await courseService.deleteTopic(topicId);
        if (result.error) {
          alert('Failed to delete topic: ' + result.error);
        } else {
          await loadTopics();
        }
      } catch (err) {
        console.error('Error deleting topic:', err);
        alert('An error occurred while deleting the topic');
      }
    }
  };

  // Filter data for search
  const getFilteredData = (data, searchTerm) => {
    if (!searchTerm) return data;
    const searchLower = searchTerm.toLowerCase();
    return data.filter(item => {
      if (!item) return false;
      return (
        item.name?.toLowerCase()?.includes(searchLower) ||
        item.code?.toLowerCase()?.includes(searchLower) ||
        item.description?.toLowerCase()?.includes(searchLower)
      );
    });
  };

  // Get current tab data
  const getCurrentData = () => {
    switch (activeTab) {
      case 'courses': return getFilteredData(courses, searchTerm);
      case 'subjects': return getFilteredData(subjects, searchTerm);
      case 'chapters': return getFilteredData(chapters, searchTerm);
      case 'topics': return getFilteredData(topics, searchTerm);
      default: return [];
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'courses', label: 'Courses', icon: 'BookOpen' },
    { id: 'subjects', label: 'Subjects', icon: 'Book' },
    { id: 'chapters', label: 'Chapters', icon: 'FileText' },
    { id: 'topics', label: 'Topics', icon: 'List' }
  ];

  const currentTab = tabs.find(tab => tab.id === activeTab);

  // Additional error prevention
  const safeGetCurrentData = () => {
    try {
      return getCurrentData();
    } catch (err) {
      console.error('Error in getCurrentData:', err);
      return [];
    }
  };

  // Render with error boundary
  try {
    return (
      <PageLayout title="Course Management">
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6 border-b">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon name={tab.icon} size={16} className="inline mr-2" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search and Add Button */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder={`Search ${currentTab?.label.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>
            
            <Button 
              onClick={() => {
                switch (activeTab) {
                  case 'courses':
                    setEditingCourse(null);
                    setShowCourseModal(true);
                    break;
                  case 'subjects':
                    setEditingSubject(null);
                    setShowSubjectModal(true);
                    break;
                  case 'chapters':
                    setEditingChapter(null);
                    setShowChapterModal(true);
                    break;
                  case 'topics':
                    setEditingTopic(null);
                    setShowTopicModal(true);
                    break;
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Icon name="Plus" size={16} />
              Add {currentTab?.label.slice(0, -1)}
            </Button>
          </div>

          {/* Content */}
          {loading && !safeGetCurrentData().length ? (
            <div className="text-center py-8">
              <Icon name="Loader" size={24} className="animate-spin mx-auto mb-4" />
              <p>Loading {currentTab?.label.toLowerCase()}...</p>
            </div>
          ) : safeGetCurrentData().length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Icon name="BookOpen" size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No {currentTab?.label} Found</h3>
              <p className="mb-4">Start by adding your first {currentTab?.label.slice(0, -1).toLowerCase()}</p>
              <Button 
                onClick={() => {
                  switch (activeTab) {
                    case 'courses':
                      setEditingCourse(null);
                      setShowCourseModal(true);
                      break;
                    case 'subjects':
                      setEditingSubject(null);
                      setShowSubjectModal(true);
                      break;
                    case 'chapters':
                      setEditingChapter(null);
                      setShowChapterModal(true);
                      break;
                    case 'topics':
                      setEditingTopic(null);
                      setShowTopicModal(true);
                      break;
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Icon name="Plus" size={16} className="mr-2" />
                Add First {currentTab?.label.slice(0, -1)}
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name & Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parent
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {safeGetCurrentData().map((item, index) => {
                      const getParentInfo = () => {
                        if (activeTab === 'subjects') {
                          const course = courses.find(c => c.id === item.courseId);
                          return course ? `${course.name} (${course.code})` : 'N/A';
                        } else if (activeTab === 'chapters') {
                          const subject = subjects.find(s => s.id === item.subjectId);
                          return subject ? `${subject.name} (${subject.code})` : 'N/A';
                        } else if (activeTab === 'topics') {
                          const chapter = chapters.find(c => c.id === item.chapterId);
                          return chapter ? `${chapter.name} (${chapter.code})` : 'N/A';
                        }
                        return 'N/A';
                      };

                      return (
                        <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              <div className="text-sm text-gray-500">{item.code}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate">
                              {item.description || 'No description'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {activeTab === 'courses' && item.level && (
                                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                  {item.level}
                                </span>
                              )}
                              {activeTab === 'subjects' && item.credits && (
                                <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                  {item.credits} credits
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {getParentInfo()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => {
                                  switch (activeTab) {
                                    case 'courses': handleEditCourse(item); break;
                                    case 'subjects': handleEditSubject(item); break;
                                    case 'chapters': handleEditChapter(item); break;
                                    case 'topics': handleEditTopic(item); break;
                                  }
                                }}
                                className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Icon name="Edit" size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  switch (activeTab) {
                                    case 'courses': handleDeleteCourse(item.id); break;
                                    case 'subjects': handleDeleteSubject(item.id); break;
                                    case 'chapters': handleDeleteChapter(item.id); break;
                                    case 'topics': handleDeleteTopic(item.id); break;
                                  }
                                }}
                                className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Icon name="Trash2" size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stats Footer */}
          <div className="mt-6 text-sm text-muted-foreground">
            Showing {safeGetCurrentData().length} of {
              activeTab === 'courses' ? courses.length :
              activeTab === 'subjects' ? subjects.length :
              activeTab === 'chapters' ? chapters.length :
              topics.length
            } {currentTab?.label.toLowerCase()}
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        </div>

        {/* Modals */}
        {showCourseModal && (
          <CourseModal
            isOpen={showCourseModal}
            onClose={() => {
              setShowCourseModal(false);
              setEditingCourse(null);
            }}
            onSubmit={handleCourseSuccess}
            course={editingCourse}
            courses={courses}
            currentUser={safeCurrentUser}
          />
        )}

        {showSubjectModal && (
          <SubjectModal
            isOpen={showSubjectModal}
            onClose={() => {
              setShowSubjectModal(false);
              setEditingSubject(null);
            }}
            onSubmit={handleSubjectSuccess}
            subject={editingSubject}
            courses={courses}
            currentUser={safeCurrentUser}
          />
        )}

        {showChapterModal && (
          <ChapterModal
            isOpen={showChapterModal}
            onClose={() => {
              setShowChapterModal(false);
              setEditingChapter(null);
            }}
            onSubmit={handleChapterSuccess}
            chapter={editingChapter}
            subjects={subjects}
            currentUser={safeCurrentUser}
          />
        )}

        {showTopicModal && (
          <TopicModal
            isOpen={showTopicModal}
            onClose={() => {
              setShowTopicModal(false);
              setEditingTopic(null);
            }}
            onSubmit={handleTopicSuccess}
            topic={editingTopic}
            subjects={subjects}
            chapters={chapters}
            currentUser={safeCurrentUser}
          />
        )}
      </PageLayout>
    );
  } catch (renderError) {
    console.error('Render error in Course Management:', renderError);
    return (
      <PageLayout title="Course Management">
        <div className="text-center py-8">
          <Icon name="AlertCircle" size={48} className="mx-auto text-red-500 mb-4" />
          <h3 className="text-xl font-semibold text-red-600 mb-2">Course Management Error</h3>
          <p className="text-red-600 mb-4">
            Something went wrong. Please refresh the page.
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Reload Page
          </Button>
        </div>
      </PageLayout>
    );
  }
};

export default CourseManagement;