import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import { courseService } from '../../services/courseService';
import { newBatchService } from '../../services/newBatchService';
import { newInstituteService } from '../../services/newInstituteService';
import PageLayout from '../../components/layout/PageLayout';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import CurriculumUploadModal from '../../components/course/CurriculumUploadModal';
// Inline Modal Components
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[calc(100%-2rem)] max-w-md shadow-lg rounded-md bg-white">
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

// Derive the list of subject codes already attached to a course, tolerating
// either a `subjectCodes: string[]` field or a populated `subjects: [...]` array.
const getCourseSubjectCodes = (course) => {
  if (!course) return [];
  if (Array.isArray(course.subjectCodes)) {
    return course.subjectCodes.filter(Boolean);
  }
  if (Array.isArray(course.subjects)) {
    return course.subjects.map((s) => (typeof s === 'string' ? s : s?.code)).filter(Boolean);
  }
  return [];
};

// Create / edit a single batch under a course. Launched from a course node in the
// Courses & Batches tree. Submission is delegated to the parent via onSubmit(form, batchId).
const EMPTY_BATCH = { name: '', code: '', description: '', startDate: '', endDate: '', capacity: '', fee: '', active: true };

const BatchModal = ({ isOpen, onClose, batch, courseName, courseFee, onSubmit }) => {
  const [form, setForm] = useState(EMPTY_BATCH);
  const [loading, setLoading] = useState(false);

  // Course fee is the recommended default for a batch; a batch may override it.
  const recommendedFee = courseFee == null || courseFee === '' ? null : Number(courseFee);

  useEffect(() => {
    if (batch && batch.id) {
      setForm({
        name: batch.name || '',
        code: batch.code || '',
        description: batch.description || '',
        startDate: (batch.startDate || '').slice(0, 10),
        endDate: (batch.endDate || '').slice(0, 10),
        capacity: batch.capacity ?? '',
        fee: batch.fee ?? '',
        active: batch.active !== undefined ? batch.active : true
      });
    } else {
      // New batch defaults to the course fee (the recommended value).
      setForm({ ...EMPTY_BATCH, fee: recommendedFee != null ? recommendedFee : '' });
    }
  }, [batch, isOpen]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // Compare the entered fee against the course fee to drive the recommendation hint.
  const feeNum = form.fee === '' || form.fee == null ? null : Number(form.fee);
  const feeMatchesCourse = recommendedFee != null && feeNum != null && feeNum === recommendedFee;
  const feeOverridden = recommendedFee != null && feeNum != null && feeNum !== recommendedFee;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { alert('Batch name is required'); return; }
    setLoading(true);
    try {
      await onSubmit(form, batch?.id || null);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-16 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-lg font-bold text-gray-900">{batch?.id ? 'Edit Batch' : 'Add Batch'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <Icon name="X" size={20} />
          </button>
        </div>
        {courseName && <p className="text-sm text-gray-500 mb-4">Course: {courseName}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Morning Batch 2026"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setField('code', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., MB-26"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setField('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setField('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
              <input
                type="number"
                min="0"
                value={form.capacity}
                onChange={(e) => setField('capacity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 30"
              />
            </div>
          </div>

          {/* Batch fee — defaults to the course fee but can be overridden per batch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fee (₹)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.fee}
                onChange={(e) => setField('fee', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={recommendedFee != null ? `Course fee: ₹${recommendedFee.toLocaleString('en-IN')}` : 'e.g., 25000'}
              />
              {recommendedFee != null && !feeMatchesCourse && (
                <button
                  type="button"
                  onClick={() => setField('fee', recommendedFee)}
                  className="whitespace-nowrap px-2 py-2 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline flex-shrink-0"
                  title="Reset to the course fee"
                >
                  Use course fee
                </button>
              )}
            </div>
            {recommendedFee != null && (
              feeMatchesCourse ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                  <Icon name="CheckCircle" size={13} />
                  Matches course fee (recommended)
                </p>
              ) : feeOverridden ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                  <Icon name="AlertTriangle" size={13} />
                  Overridden — course fee is ₹{recommendedFee.toLocaleString('en-IN')}
                </p>
              ) : (
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                  <Icon name="Info" size={13} />
                  Leave blank to use the course fee (₹{recommendedFee.toLocaleString('en-IN')})
                </p>
              )
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Batch description..."
            />
          </div>

          {batch?.id && (
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setField('active', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Active batch
            </label>
          )}

          <div className="flex justify-end space-x-3 pt-2">
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
              {loading ? 'Saving...' : batch?.id ? 'Update Batch' : 'Create Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CourseModal = ({ isOpen, onClose, course, onSubmit, subjects = [], currentUser }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    level: 'Undergraduate',
    duration: '4',
    fee: '',
    subjectCodes: []
  });

  const [loading, setLoading] = useState(false);
  const [subjectsOpen, setSubjectsOpen] = useState(false);

  useEffect(() => {
    if (course) {
      setFormData({
        name: course.name || '',
        code: course.code || '',
        description: course.description || '',
        level: course.level || 'Undergraduate',
        duration: course.duration || '4',
        fee: course.fee ?? '',
        subjectCodes: getCourseSubjectCodes(course)
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        level: 'Undergraduate',
        duration: '4',
        fee: '',
        subjectCodes: []
      });
    }
    setSubjectsOpen(false);
  }, [course]);

  // Toggle a subject code in/out of the course's subject selection.
  const toggleSubjectCode = (code) => {
    setFormData((prev) => {
      const selected = new Set(prev.subjectCodes || []);
      if (selected.has(code)) {
        selected.delete(code);
      } else {
        selected.add(code);
      }
      return { ...prev, subjectCodes: Array.from(selected) };
    });
  };

  // Only offer subjects that actually have a code (subjectCodes is keyed by code).
  const selectableSubjects = subjects.filter((s) => s?.code);
  const selectedCount = formData.subjectCodes.length;

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
        fee: formData.fee === '' || formData.fee == null ? null : Number(formData.fee),
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
            Fee (₹)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.fee}
            onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 25000"
          />
          <p className="mt-1 text-xs text-gray-400">Default fee for batches of this course; each batch can override it.</p>
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

        {/* Attach subjects to this course (maps to subjectCodes on the course API) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subjects
          </label>
          <button
            type="button"
            onClick={() => setSubjectsOpen((open) => !open)}
            className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className={selectedCount ? 'text-gray-900' : 'text-gray-400'}>
              {selectedCount ? `${selectedCount} subject${selectedCount > 1 ? 's' : ''} selected` : 'Select subjects'}
            </span>
            <Icon name={subjectsOpen ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-gray-400" />
          </button>

          {/* Selected subjects shown as removable chips */}
          {selectedCount > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.subjectCodes.map((code) => {
                const subj = selectableSubjects.find((s) => s.code === code);
                return (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                  >
                    {subj ? `${subj.name} (${subj.code})` : code}
                    <button
                      type="button"
                      onClick={() => toggleSubjectCode(code)}
                      className="hover:text-blue-900"
                      title="Remove"
                    >
                      <Icon name="X" size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {subjectsOpen && (
            <div className="mt-2 border border-gray-200 rounded-md max-h-48 overflow-y-auto divide-y divide-gray-100">
              {selectableSubjects.length === 0 ? (
                <p className="px-3 py-3 text-sm text-gray-500">
                  No subjects available. Create subjects first, then attach them here.
                </p>
              ) : (
                selectableSubjects.map((subj) => {
                  const checked = formData.subjectCodes.includes(subj.code);
                  return (
                    <label
                      key={subj.id ?? subj.code}
                      className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSubjectCode(subj.code)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-900">{subj.name}</span>
                      <span className="text-gray-500">({subj.code})</span>
                    </label>
                  );
                })
              )}
            </div>
          )}
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

const SubjectModal = ({ isOpen, onClose, subject, onSubmit, currentUser }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    duration: '1 Semester'
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subject) {
      setFormData({
        name: subject.name || '',
        code: subject.code || '',
        description: subject.description || '',
        duration: subject.duration || '1 Semester'
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        duration: '1 Semester'
      });
    }
  }, [subject]);

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
      }, subject?.id);
    } finally {
      setLoading(false);
    }
  };

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
    <Modal isOpen={isOpen} onClose={onClose} title={chapter?.id ? 'Edit Chapter' : 'Add Chapter'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            {loading ? 'Saving...' : chapter?.id ? 'Update' : 'Create'}
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
    <Modal isOpen={isOpen} onClose={onClose} title={topic?.id ? 'Edit Topic' : 'Add Topic'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            {loading ? 'Saving...' : topic?.id ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const CourseManagement = () => {
  const { user, userProfile } = useAuth();
  const currentUser = userProfile || user;

  // Try to get SuperAdmin context for institute-change refetch
  let superAdminContext = null;
  try {
    superAdminContext = useSuperAdmin();
  } catch (e) {
    // Not in super-admin context
  }

  // State management
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Two trees: 'coursesBatches' (course → batches) and 'curriculum' (subject → chapter → topic)
  const [activeTab, setActiveTab] = useState('coursesBatches');
  const [searchTerm, setSearchTerm] = useState('');

  // Tree expand/collapse state (sets of ids) + lazily-loaded batches per course.
  const [expandedCourses, setExpandedCourses] = useState(() => new Set());
  const [expandedSubjects, setExpandedSubjects] = useState(() => new Set());
  const [expandedChapters, setExpandedChapters] = useState(() => new Set());
  const [batchesByCourse, setBatchesByCourse] = useState({}); // courseId -> batch[]
  const [loadingBatchCourses, setLoadingBatchCourses] = useState(() => new Set());
  
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
  const [showCurriculumUpload, setShowCurriculumUpload] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const [editingCourse, setEditingCourse] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [editingChapter, setEditingChapter] = useState(null);
  const [editingTopic, setEditingTopic] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);
  const [batchCourse, setBatchCourse] = useState(null); // parent course for the batch modal

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

  // Reload all data when super-admin switches institute
  useEffect(() => {
    if (superAdminContext?.selectedInstitute?.id) {
      loadAllData();
    }
  }, [superAdminContext?.selectedInstitute?.id]);

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

  // ---- Batch tree: lazy loading + CRUD ----
  const loadBatches = useCallback(async (courseId) => {
    setLoadingBatchCourses((prev) => new Set(prev).add(courseId));
    const { data } = await newBatchService.getBatchesByCourse(courseId);
    setBatchesByCourse((prev) => ({ ...prev, [courseId]: Array.isArray(data) ? data : [] }));
    setLoadingBatchCourses((prev) => {
      const next = new Set(prev);
      next.delete(courseId);
      return next;
    });
  }, []);

  const toggleCourse = (courseId) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
        if (batchesByCourse[courseId] === undefined) loadBatches(courseId);
      }
      return next;
    });
  };

  const toggleInSet = (setter) => (id) =>
    setter((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleSubject = toggleInSet(setExpandedSubjects);
  const toggleChapter = toggleInSet(setExpandedChapters);

  const openAddBatch = (course) => { setBatchCourse(course); setEditingBatch(null); setShowBatchModal(true); };
  const openEditBatch = (course, batch) => { setBatchCourse(course); setEditingBatch(batch); setShowBatchModal(true); };
  // Pre-seed the parent id so the create form opens scoped to the right subject/chapter,
  // and expand that parent so the newly-created child is visible after the list reloads.
  const openAddChapter = (subject) => {
    setExpandedSubjects((prev) => new Set(prev).add(subject.id));
    setEditingChapter({ subjectId: subject.id });
    setShowChapterModal(true);
  };
  const openAddTopic = (chapter) => {
    setExpandedChapters((prev) => new Set(prev).add(chapter.id));
    setEditingTopic({ subjectId: chapter.subjectId, chapterId: chapter.id });
    setShowTopicModal(true);
  };

  const handleBatchSuccess = async (formData, batchId = null) => {
    const payload = { name: formData.name.trim() };
    if (formData.code?.trim()) payload.code = formData.code.trim();
    if (formData.description?.trim()) payload.description = formData.description.trim();
    if (formData.startDate) payload.startDate = formData.startDate;
    if (formData.endDate) payload.endDate = formData.endDate;
    if (formData.capacity !== '' && formData.capacity != null) payload.capacity = Number(formData.capacity);
    // Empty fee means "inherit the course fee" — send null so the backend can fall back.
    payload.fee = formData.fee === '' || formData.fee == null ? null : Number(formData.fee);

    let result;
    if (batchId) {
      payload.active = formData.active;
      result = await newBatchService.updateBatch(batchId, payload);
    } else {
      payload.courseId = batchCourse?.id;
      if (safeCurrentUser?.instituteId) payload.instituteId = safeCurrentUser.instituteId;
      result = await newBatchService.createBatch(payload);
    }

    if (result.error) {
      alert(`Failed to ${batchId ? 'update' : 'create'} batch: ${result.error.message || result.error}`);
      return;
    }
    setShowBatchModal(false);
    setEditingBatch(null);
    if (batchCourse?.id) {
      await loadBatches(batchCourse.id);
      setExpandedCourses((prev) => new Set(prev).add(batchCourse.id));
    }
  };

  const handleDeleteBatch = async (courseId, batchId) => {
    if (!confirm('Are you sure you want to delete this batch?')) return;
    const { error: delError } = await newBatchService.deleteBatch(batchId);
    if (delError) {
      alert('Failed to delete batch: ' + (delError.message || delError));
      return;
    }
    await loadBatches(courseId);
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

  // Two-tab config for the tree views.
  const tabs = [
    { id: 'coursesBatches', label: 'Courses & Batches', icon: 'BookOpen' },
    { id: 'curriculum', label: 'Curriculum', icon: 'Book' }
  ];

  // Root nodes filtered by the search box (courses for one tab, subjects for the other).
  const filteredCourses = getFilteredData(courses, searchTerm);
  const filteredSubjects = getFilteredData(subjects, searchTerm);
  // Child lookups for the curriculum tree (string-compare to tolerate id type drift).
  const chaptersOf = (subjectId) => chapters.filter((c) => String(c.subjectId) === String(subjectId));
  const topicsOf = (chapterId) => topics.filter((t) => String(t.chapterId) === String(chapterId));
  const fmtDate = (d) => (d ? String(d).slice(0, 10) : '');
  const fmtFee = (f) => (f == null || f === '' ? null : `₹${Number(f).toLocaleString('en-IN')}`);

  // Shared button styles for tree row actions.
  const actionBtn = 'p-1.5 rounded transition-colors';

  // Render with error boundary
  try {
    return (
      <PageLayout
        title="Course Management"
        showInstituteDropdown={currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'super-admin'}
        institutes={superAdminContext?.allInstitutes || []}
        selectedInstitute={superAdminContext?.selectedInstitute || null}
        onInstituteChange={superAdminContext?.handleInstituteChange || (() => {})}
        institutesLoading={superAdminContext?.institutesLoading || false}
      >
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

          {/* Toolbar: search + contextual add */}
          <div className="flex justify-between items-center mb-6 gap-3">
            <input
              type="text"
              placeholder={activeTab === 'coursesBatches' ? 'Search courses...' : 'Search subjects...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />

            <div className="flex items-center gap-3">
              {activeTab === 'curriculum' && (
                <Button
                  variant="outline"
                  onClick={() => setShowCurriculumUpload(true)}
                  className="flex items-center gap-2"
                  title="Create subjects, chapters and topics from a CSV file"
                >
                  <Icon name="Upload" size={16} />
                  Bulk Upload (CSV)
                </Button>
              )}

              <Button
                onClick={() => {
                  if (activeTab === 'coursesBatches') {
                    setEditingCourse(null);
                    setShowCourseModal(true);
                  } else {
                    setEditingSubject(null);
                    setShowSubjectModal(true);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Icon name="Plus" size={16} />
                {activeTab === 'coursesBatches' ? 'Add Course' : 'Add Subject'}
              </Button>
            </div>
          </div>

          {/* Tree content */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <Icon name="Loader" size={24} className="animate-spin mx-auto mb-4" />
              <p>Loading...</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {activeTab === 'coursesBatches' ? (
                /* ---- Courses → Batches tree ---- */
                filteredCourses.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Icon name="BookOpen" size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">No Courses Found</h3>
                    <p className="mb-4">{searchTerm ? 'Try a different search.' : 'Start by adding your first course.'}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredCourses.map((course) => {
                      const open = expandedCourses.has(course.id);
                      const batches = batchesByCourse[course.id];
                      const loadingB = loadingBatchCourses.has(course.id);
                      return (
                        <div key={course.id}>
                          {/* Course row */}
                          <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                            <button
                              onClick={() => toggleCourse(course.id)}
                              className="flex items-center gap-2 min-w-0 flex-1 text-left"
                            >
                              <Icon name={open ? 'ChevronDown' : 'ChevronRight'} size={18} className="text-gray-400 flex-shrink-0" />
                              <Icon name="BookOpen" size={16} className="text-blue-600 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-900 truncate">{course.name}</span>
                              {course.code && <span className="text-xs text-gray-500">({course.code})</span>}
                              {course.level && (
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">{course.level}</span>
                              )}
                              {fmtFee(course.fee) && (
                                <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">{fmtFee(course.fee)}</span>
                              )}
                              {Array.isArray(batches) && (
                                <span className="text-xs text-gray-400">{batches.length} batch{batches.length === 1 ? '' : 'es'}</span>
                              )}
                            </button>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => openAddBatch(course)} title="Add batch" className={`${actionBtn} text-green-600 hover:text-green-800 hover:bg-green-50`}>
                                <Icon name="Plus" size={16} />
                              </button>
                              <button onClick={() => handleEditCourse(course)} title="Edit course" className={`${actionBtn} text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50`}>
                                <Icon name="Edit" size={16} />
                              </button>
                              <button onClick={() => handleDeleteCourse(course.id)} title="Delete course" className={`${actionBtn} text-red-600 hover:text-red-900 hover:bg-red-50`}>
                                <Icon name="Trash2" size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Batches under the course */}
                          {open && (
                            <div className="bg-gray-50/60 pl-10 pr-4 pb-2">
                              {loadingB ? (
                                <div className="py-2 text-sm text-gray-400 flex items-center gap-2">
                                  <Icon name="Loader" size={14} className="animate-spin" /> Loading batches...
                                </div>
                              ) : !batches || batches.length === 0 ? (
                                <div className="py-2 text-sm text-gray-400">
                                  No batches yet.{' '}
                                  <button onClick={() => openAddBatch(course)} className="text-blue-600 hover:underline">Add one</button>
                                </div>
                              ) : (
                                <div className="divide-y divide-gray-100">
                                  {batches.map((b) => (
                                    <div key={b.id} className="flex items-center justify-between py-2">
                                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                        <Icon name="Users" size={14} className="text-gray-400 flex-shrink-0" />
                                        <span className="text-sm text-gray-800 truncate">{b.name}</span>
                                        {b.code && <span className="text-xs text-gray-500">({b.code})</span>}
                                        {b.active === false && (
                                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">Inactive</span>
                                        )}
                                        {(b.startDate || b.endDate) && (
                                          <span className="text-xs text-gray-400">{fmtDate(b.startDate) || '…'} → {fmtDate(b.endDate) || '…'}</span>
                                        )}
                                        {b.capacity != null && b.capacity !== '' && (
                                          <span className="text-xs text-gray-400">· Cap {b.capacity}</span>
                                        )}
                                        {fmtFee(b.fee) && (
                                          b.fee != null && course.fee != null && Number(b.fee) !== Number(course.fee) ? (
                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700" title={`Overrides course fee (${fmtFee(course.fee)})`}>
                                              <Icon name="AlertTriangle" size={11} />{fmtFee(b.fee)}
                                            </span>
                                          ) : (
                                            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">{fmtFee(b.fee)}</span>
                                          )
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <button onClick={() => openEditBatch(course, b)} title="Edit batch" className={`${actionBtn} text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50`}>
                                          <Icon name="Edit" size={14} />
                                        </button>
                                        <button onClick={() => handleDeleteBatch(course.id, b.id)} title="Delete batch" className={`${actionBtn} text-red-600 hover:text-red-900 hover:bg-red-50`}>
                                          <Icon name="Trash2" size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* ---- Subjects → Chapters → Topics tree ---- */
                filteredSubjects.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Icon name="Book" size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">No Subjects Found</h3>
                    <p className="mb-4">{searchTerm ? 'Try a different search.' : 'Start by adding your first subject.'}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredSubjects.map((subject) => {
                      const sOpen = expandedSubjects.has(subject.id);
                      const subjChapters = chaptersOf(subject.id);
                      return (
                        <div key={subject.id}>
                          {/* Subject row */}
                          <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                            <button onClick={() => toggleSubject(subject.id)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
                              <Icon name={sOpen ? 'ChevronDown' : 'ChevronRight'} size={18} className="text-gray-400 flex-shrink-0" />
                              <Icon name="Book" size={16} className="text-green-600 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-900 truncate">{subject.name}</span>
                              {subject.code && <span className="text-xs text-gray-500">({subject.code})</span>}
                              <span className="text-xs text-gray-400">{subjChapters.length} chapter{subjChapters.length === 1 ? '' : 's'}</span>
                            </button>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => openAddChapter(subject)} title="Add chapter" className={`${actionBtn} text-green-600 hover:text-green-800 hover:bg-green-50`}>
                                <Icon name="Plus" size={16} />
                              </button>
                              <button onClick={() => handleEditSubject(subject)} title="Edit subject" className={`${actionBtn} text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50`}>
                                <Icon name="Edit" size={16} />
                              </button>
                              <button onClick={() => handleDeleteSubject(subject.id)} title="Delete subject" className={`${actionBtn} text-red-600 hover:text-red-900 hover:bg-red-50`}>
                                <Icon name="Trash2" size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Chapters */}
                          {sOpen && (
                            <div className="bg-gray-50/40 pl-8">
                              {subjChapters.length === 0 ? (
                                <div className="py-2 pl-2 text-sm text-gray-400">
                                  No chapters yet.{' '}
                                  <button onClick={() => openAddChapter(subject)} className="text-blue-600 hover:underline">Add one</button>
                                </div>
                              ) : (
                                subjChapters.map((chapter) => {
                                  const cOpen = expandedChapters.has(chapter.id);
                                  const chTopics = topicsOf(chapter.id);
                                  return (
                                    <div key={chapter.id} className="border-l border-gray-200">
                                      {/* Chapter row */}
                                      <div className="flex items-center justify-between px-4 py-2 hover:bg-gray-100/60">
                                        <button onClick={() => toggleChapter(chapter.id)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
                                          <Icon name={cOpen ? 'ChevronDown' : 'ChevronRight'} size={16} className="text-gray-400 flex-shrink-0" />
                                          <Icon name="FileText" size={14} className="text-amber-600 flex-shrink-0" />
                                          <span className="text-sm text-gray-800 truncate">{chapter.name}</span>
                                          {chapter.code && <span className="text-xs text-gray-500">({chapter.code})</span>}
                                          <span className="text-xs text-gray-400">{chTopics.length} topic{chTopics.length === 1 ? '' : 's'}</span>
                                        </button>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          <button onClick={() => openAddTopic(chapter)} title="Add topic" className={`${actionBtn} text-green-600 hover:text-green-800 hover:bg-green-50`}>
                                            <Icon name="Plus" size={14} />
                                          </button>
                                          <button onClick={() => handleEditChapter(chapter)} title="Edit chapter" className={`${actionBtn} text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50`}>
                                            <Icon name="Edit" size={14} />
                                          </button>
                                          <button onClick={() => handleDeleteChapter(chapter.id)} title="Delete chapter" className={`${actionBtn} text-red-600 hover:text-red-900 hover:bg-red-50`}>
                                            <Icon name="Trash2" size={14} />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Topics */}
                                      {cOpen && (
                                        <div className="pl-10 pr-4 pb-2">
                                          {chTopics.length === 0 ? (
                                            <div className="py-1 text-sm text-gray-400">
                                              No topics yet.{' '}
                                              <button onClick={() => openAddTopic(chapter)} className="text-blue-600 hover:underline">Add one</button>
                                            </div>
                                          ) : (
                                            <div className="divide-y divide-gray-100">
                                              {chTopics.map((topic) => (
                                                <div key={topic.id} className="flex items-center justify-between py-2">
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    <Icon name="List" size={14} className="text-gray-400 flex-shrink-0" />
                                                    <span className="text-sm text-gray-700 truncate">{topic.name}</span>
                                                    {topic.code && <span className="text-xs text-gray-500">({topic.code})</span>}
                                                  </div>
                                                  <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button onClick={() => handleEditTopic(topic)} title="Edit topic" className={`${actionBtn} text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50`}>
                                                      <Icon name="Edit" size={14} />
                                                    </button>
                                                    <button onClick={() => handleDeleteTopic(topic.id)} title="Delete topic" className={`${actionBtn} text-red-600 hover:text-red-900 hover:bg-red-50`}>
                                                      <Icon name="Trash2" size={14} />
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}
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
            subjects={subjects}
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

        {showCurriculumUpload && (
          <CurriculumUploadModal
            isOpen={showCurriculumUpload}
            onClose={() => setShowCurriculumUpload(false)}
            onUploaded={loadAllData}
          />
        )}

        {showBatchModal && (
          <BatchModal
            isOpen={showBatchModal}
            onClose={() => {
              setShowBatchModal(false);
              setEditingBatch(null);
            }}
            onSubmit={handleBatchSuccess}
            batch={editingBatch}
            courseName={batchCourse ? `${batchCourse.name}${batchCourse.code ? ` (${batchCourse.code})` : ''}` : ''}
            courseFee={batchCourse?.fee}
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