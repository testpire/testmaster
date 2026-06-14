import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import { courseService } from '../../services/courseService';
import { newBatchService } from '../../services/newBatchService';
import PageLayout from '../../components/layout/PageLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Icon from '../../components/AppIcon';
import CurriculumUploadModal from '../../components/course/CurriculumUploadModal';
import { fetchAllPages } from '../../utils/pagination';

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
      <div className="relative top-16 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-card">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-lg font-bold text-foreground">{batch?.id ? 'Edit Batch' : 'Add Batch'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground transition-colors">
            <Icon name="X" size={20} />
          </button>
        </div>
        {courseName && <p className="text-sm text-muted-foreground mb-4">Course: {courseName}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Batch Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., Morning Batch 2026"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Batch Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setField('code', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., MB-26"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setField('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setField('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Capacity</label>
              <input
                type="number"
                min="0"
                value={form.capacity}
                onChange={(e) => setField('capacity', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., 30"
              />
            </div>
          </div>

          {/* Batch fee — defaults to the course fee but can be overridden per batch */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Fee (₹)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.fee}
                onChange={(e) => setField('fee', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
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
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon name="Info" size={13} />
                  Leave blank to use the course fee (₹{recommendedFee.toLocaleString('en-IN')})
                </p>
              )
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              placeholder="Batch description..."
            />
          </div>

          {batch?.id && (
            <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setField('active', e.target.checked)}
                className="rounded border-border text-blue-600 focus:ring-ring"
              />
              Active batch
            </label>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted"
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
        fee: course.fee ?? '',
        subjectCodes: getCourseSubjectCodes(course)
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
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
          <label className="block text-sm font-medium text-foreground mb-1">
            Course Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g., Computer Science"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Course Code *
          </label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g., CSE01"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Fee (₹)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.fee}
            onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g., 25000"
          />
          <p className="mt-1 text-xs text-muted-foreground">Default fee for batches of this course; each batch can override it.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            rows={3}
            placeholder="Course description..."
          />
        </div>

        {/* Attach subjects to this course (maps to subjectCodes on the course API) */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Subjects
          </label>
          <button
            type="button"
            onClick={() => setSubjectsOpen((open) => !open)}
            className="w-full flex items-center justify-between px-3 py-2 border border-border rounded-md text-left focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <span className={selectedCount ? 'text-foreground' : 'text-muted-foreground'}>
              {selectedCount ? `${selectedCount} subject${selectedCount > 1 ? 's' : ''} selected` : 'Select subjects'}
            </span>
            <Icon name={subjectsOpen ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-muted-foreground" />
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
            <div className="mt-2 border border-border rounded-md max-h-48 overflow-y-auto divide-y divide-gray-100">
              {selectableSubjects.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">
                  No subjects available. Create subjects first, then attach them here.
                </p>
              ) : (
                selectableSubjects.map((subj) => {
                  const checked = formData.subjectCodes.includes(subj.code);
                  return (
                    <label
                      key={subj.id ?? subj.code}
                      className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSubjectCode(subj.code)}
                        className="rounded border-border text-blue-600 focus:ring-ring"
                      />
                      <span className="text-foreground">{subj.name}</span>
                      <span className="text-muted-foreground">({subj.code})</span>
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
            className="px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted"
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
          <label className="block text-sm font-medium text-foreground mb-1">
            Subject Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g., Data Structures"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Subject Code *
          </label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g., CS101"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Duration
          </label>
          <input
            type="text"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g., 1 Semester"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            rows={3}
            placeholder="Subject description..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted"
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
            <label className="block text-sm font-medium text-foreground mb-1">
              Chapter Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter chapter name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Chapter Code
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g., CH01"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Subject *
            </label>
            <select
              value={formData.subjectId}
              onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
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
            <label className="block text-sm font-medium text-foreground mb-1">
              Duration
            </label>
            <input
              type="text"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g., 1 Week"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            rows={3}
            placeholder="Chapter description..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted"
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

const TopicModal = ({ isOpen, onClose, topic, onSubmit, subjects, currentUser }) => {
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

  // Lazy-load the chosen subject's chapters via ?include=chapters for the dropdown.
  useEffect(() => {
    let cancelled = false;
    if (!formData.subjectId) {
      setFilteredChapters([]);
      return;
    }
    (async () => {
      const { data } = await courseService.getSubjectById(formData.subjectId, { include: 'chapters' });
      if (cancelled) return;
      const list = data?.chapters || [];
      setFilteredChapters(list);
      // Drop a stale chapter selection that doesn't belong to the chosen subject.
      setFormData((prev) =>
        prev.chapterId && !list.find((ch) => String(ch.id) === String(prev.chapterId))
          ? { ...prev, chapterId: '' }
          : prev
      );
    })();
    return () => { cancelled = true; };
  }, [formData.subjectId]);

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
            <label className="block text-sm font-medium text-foreground mb-1">
              Topic Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter topic name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Topic Code
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g., T01"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Subject *
            </label>
            <select
              value={formData.subjectId}
              onChange={(e) => setFormData({ ...formData, subjectId: e.target.value, chapterId: '' })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
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
            <label className="block text-sm font-medium text-foreground mb-1">
              Chapter
            </label>
            <select
              value={formData.chapterId}
              onChange={(e) => setFormData({ ...formData, chapterId: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
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
          <label className="block text-sm font-medium text-foreground mb-1">
            Duration
          </label>
          <input
            type="text"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g., 2 Days"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            rows={3}
            placeholder="Topic description..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted"
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
  const navigate = useNavigate();
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
  // Curriculum children are lazy-loaded per node via the ?include= endpoints,
  // keyed by parent id, with a per-parent loading set for spinners.
  const [chaptersBySubject, setChaptersBySubject] = useState({}); // subjectId -> chapter[]
  const [topicsByChapter, setTopicsByChapter] = useState({}); // chapterId -> topic[]
  const [loadingChapterSubjects, setLoadingChapterSubjects] = useState(() => new Set());
  const [loadingTopicChapters, setLoadingTopicChapters] = useState(() => new Set());
  
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

  // Load functions with error handling. Each pages through the full set (the tree
  // needs every node available to expand) — institute scoping is server-side via
  // the JWT / X-Institute-Id header, not a function argument.
  const loadCourses = useCallback(async () => {
    try {
      const data = await fetchAllPages((pg) => courseService.getCourses(pg));
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading courses:', err);
      setCourses([]);
    }
  }, []);

  const loadSubjects = useCallback(async (courseId = null) => {
    try {
      const data = await fetchAllPages((pg) => courseService.getSubjects(courseId, pg));
      setSubjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading subjects:', err);
      setSubjects([]);
    }
  }, []);

  // Lazy per-node loaders for the curriculum tree, via the ?include= endpoints.
  const loadChaptersForSubject = useCallback(async (subjectId) => {
    setLoadingChapterSubjects((prev) => new Set(prev).add(subjectId));
    const { data } = await courseService.getSubjectById(subjectId, { include: 'chapters' });
    setChaptersBySubject((prev) => ({ ...prev, [subjectId]: data?.chapters || [] }));
    setLoadingChapterSubjects((prev) => { const next = new Set(prev); next.delete(subjectId); return next; });
  }, []);

  const loadTopicsForChapter = useCallback(async (chapterId) => {
    setLoadingTopicChapters((prev) => new Set(prev).add(chapterId));
    const { data } = await courseService.getChapterById(chapterId, { include: 'topics' });
    setTopicsByChapter((prev) => ({ ...prev, [chapterId]: data?.topics || [] }));
    setLoadingTopicChapters((prev) => { const next = new Set(prev); next.delete(chapterId); return next; });
  }, []);

  // Combined load function
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Children load lazily on expand — clear any cached subtree so a fresh
      // expand refetches (e.g. after an institute switch or curriculum upload).
      setChaptersBySubject({});
      setTopicsByChapter({});
      await Promise.all([
        loadCourses(),
        loadSubjects()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load some data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [loadCourses, loadSubjects]);

  // Initial data load + reload when a super-admin switches institute.
  // Keyed on a stable user identifier — the profile from /auth/profile has no `id`,
  // so we key on username/email (institute scoping is server-side via the JWT /
  // X-Institute-Id header, not the user id) and the selected institute id.
  const currentUserKey = currentUser?.username || currentUser?.email || null;
  const selectedInstituteId = superAdminContext?.selectedInstitute?.id ?? null;
  useEffect(() => {
    if (!currentUserKey) return;
    loadAllData();
  }, [currentUserKey, selectedInstituteId, loadAllData]);

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
      // Refresh just the affected subject's chapters in the lazy cache.
      if (chapterData.subjectId != null) await loadChaptersForSubject(chapterData.subjectId);
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
      // Refresh just the affected chapter's topics in the lazy cache.
      if (topicData.chapterId != null) await loadTopicsForChapter(topicData.chapterId);
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

  const handleDeleteChapter = async (chapterId, subjectId) => {
    if (confirm('Are you sure you want to delete this chapter?')) {
      try {
        const result = await courseService.deleteChapter(chapterId);
        if (result.error) {
          alert('Failed to delete chapter: ' + result.error);
        } else if (subjectId != null) {
          await loadChaptersForSubject(subjectId);
        }
      } catch (err) {
        console.error('Error deleting chapter:', err);
        alert('An error occurred while deleting the chapter');
      }
    }
  };

  const handleDeleteTopic = async (topicId, chapterId) => {
    if (confirm('Are you sure you want to delete this topic?')) {
      try {
        const result = await courseService.deleteTopic(topicId);
        if (result.error) {
          alert('Failed to delete topic: ' + result.error);
        } else if (chapterId != null) {
          await loadTopicsForChapter(chapterId);
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

  // Expand/collapse a subject; lazy-load its chapters on first expand.
  const toggleSubject = (subjectId) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
        if (chaptersBySubject[subjectId] === undefined) loadChaptersForSubject(subjectId);
      }
      return next;
    });
  };
  // Expand/collapse a chapter; lazy-load its topics on first expand.
  const toggleChapter = (chapterId) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
        if (topicsByChapter[chapterId] === undefined) loadTopicsForChapter(chapterId);
      }
      return next;
    });
  };

  const openAddBatch = (course) => { setBatchCourse(course); setEditingBatch(null); setShowBatchModal(true); };
  const openEditBatch = (course, batch) => { setBatchCourse(course); setEditingBatch(batch); setShowBatchModal(true); };
  // Pre-seed the parent id so the create form opens scoped to the right subject/chapter,
  // and expand that parent so the newly-created child is visible after the list reloads.
  const openAddChapter = (subject) => {
    setExpandedSubjects((prev) => new Set(prev).add(subject.id));
    if (chaptersBySubject[subject.id] === undefined) loadChaptersForSubject(subject.id);
    setEditingChapter({ subjectId: subject.id });
    setShowChapterModal(true);
  };
  const openAddTopic = (chapter) => {
    setExpandedChapters((prev) => new Set(prev).add(chapter.id));
    if (topicsByChapter[chapter.id] === undefined) loadTopicsForChapter(chapter.id);
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
  // Child lookups for the curriculum tree — read from the lazy per-parent caches
  // (undefined until that node is first expanded).
  const chaptersOf = (subjectId) => chaptersBySubject[subjectId] || [];
  const topicsOf = (chapterId) => topicsByChapter[chapterId] || [];
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
                    : 'border-transparent text-muted-foreground hover:text-foreground'
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
              className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent w-64"
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
                className="flex items-center gap-2"
              >
                <Icon name="Plus" size={16} />
                {activeTab === 'coursesBatches' ? 'Add Course' : 'Add Subject'}
              </Button>
            </div>
          </div>

          {/* Tree content */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icon name="Loader" size={24} className="animate-spin mx-auto mb-4" />
              <p>Loading...</p>
            </div>
          ) : (
            <div className="bg-card rounded-lg shadow overflow-hidden">
              {activeTab === 'coursesBatches' ? (
                /* ---- Courses → Batches tree ---- */
                filteredCourses.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
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
                          <div className="flex items-center justify-between px-4 py-3 hover:bg-muted">
                            <button
                              onClick={() => toggleCourse(course.id)}
                              className="flex items-center gap-2 min-w-0 flex-1 text-left"
                            >
                              <Icon name={open ? 'ChevronDown' : 'ChevronRight'} size={18} className="text-muted-foreground flex-shrink-0" />
                              <Icon name="BookOpen" size={16} className="text-blue-600 flex-shrink-0" />
                              <span className="text-sm font-medium text-foreground truncate">{course.name}</span>
                              {course.code && <span className="text-xs text-muted-foreground">({course.code})</span>}
                              {fmtFee(course.fee) && (
                                <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">{fmtFee(course.fee)}</span>
                              )}
                              {Array.isArray(batches) && (
                                <span className="text-xs text-muted-foreground">{batches.length} batch{batches.length === 1 ? '' : 'es'}</span>
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
                            <div className="bg-muted/60 pl-10 pr-4 pb-2">
                              {loadingB ? (
                                <div className="py-2 text-sm text-muted-foreground flex items-center gap-2">
                                  <Icon name="Loader" size={14} className="animate-spin" /> Loading batches...
                                </div>
                              ) : !batches || batches.length === 0 ? (
                                <div className="py-2 text-sm text-muted-foreground">
                                  No batches yet.{' '}
                                  <button onClick={() => openAddBatch(course)} className="text-blue-600 hover:underline">Add one</button>
                                </div>
                              ) : (
                                <div className="divide-y divide-gray-100">
                                  {batches.map((b) => (
                                    <div key={b.id} className="flex items-center justify-between py-2">
                                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                        <Icon name="Users" size={14} className="text-muted-foreground flex-shrink-0" />
                                        <span className="text-sm text-foreground truncate">{b.name}</span>
                                        {b.code && <span className="text-xs text-muted-foreground">({b.code})</span>}
                                        {b.active === false && (
                                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-muted-foreground">Inactive</span>
                                        )}
                                        {(b.startDate || b.endDate) && (
                                          <span className="text-xs text-muted-foreground">{fmtDate(b.startDate) || '…'} → {fmtDate(b.endDate) || '…'}</span>
                                        )}
                                        {b.capacity != null && b.capacity !== '' && (
                                          <span className="text-xs text-muted-foreground">· Cap {b.capacity}</span>
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
                  <div className="text-center py-12 text-muted-foreground">
                    <Icon name="Book" size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">No Subjects Found</h3>
                    <p className="mb-4">{searchTerm ? 'Try a different search.' : 'Start by adding your first subject.'}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredSubjects.map((subject) => {
                      const sOpen = expandedSubjects.has(subject.id);
                      const subjChapters = chaptersOf(subject.id);
                      const chaptersLoaded = chaptersBySubject[subject.id] !== undefined;
                      const chaptersLoading = loadingChapterSubjects.has(subject.id);
                      return (
                        <div key={subject.id}>
                          {/* Subject row */}
                          <div className="flex items-center justify-between px-4 py-3 hover:bg-muted">
                            <button onClick={() => toggleSubject(subject.id)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
                              <Icon name={sOpen ? 'ChevronDown' : 'ChevronRight'} size={18} className="text-muted-foreground flex-shrink-0" />
                              <Icon name="Book" size={16} className="text-green-600 flex-shrink-0" />
                              <span className="text-sm font-medium text-foreground truncate">{subject.name}</span>
                              {subject.code && <span className="text-xs text-muted-foreground">({subject.code})</span>}
                              {chaptersLoaded && (
                                <span className="text-xs text-muted-foreground">{subjChapters.length} chapter{subjChapters.length === 1 ? '' : 's'}</span>
                              )}
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
                            <div className="bg-muted/40 pl-8">
                              {chaptersLoading ? (
                                <div className="py-2 pl-2 text-sm text-muted-foreground">Loading chapters…</div>
                              ) : subjChapters.length === 0 ? (
                                <div className="py-2 pl-2 text-sm text-muted-foreground">
                                  No chapters yet.{' '}
                                  <button onClick={() => openAddChapter(subject)} className="text-blue-600 hover:underline">Add one</button>
                                </div>
                              ) : (
                                subjChapters.map((chapter) => {
                                  const cOpen = expandedChapters.has(chapter.id);
                                  const chTopics = topicsOf(chapter.id);
                                  const topicsLoaded = topicsByChapter[chapter.id] !== undefined;
                                  const topicsLoading = loadingTopicChapters.has(chapter.id);
                                  return (
                                    <div key={chapter.id} className="border-l border-border">
                                      {/* Chapter row */}
                                      <div className="flex items-center justify-between px-4 py-2 hover:bg-muted/60">
                                        <button onClick={() => toggleChapter(chapter.id)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
                                          <Icon name={cOpen ? 'ChevronDown' : 'ChevronRight'} size={16} className="text-muted-foreground flex-shrink-0" />
                                          <Icon name="FileText" size={14} className="text-amber-600 flex-shrink-0" />
                                          <span className="text-sm text-foreground truncate">{chapter.name}</span>
                                          {chapter.code && <span className="text-xs text-muted-foreground">({chapter.code})</span>}
                                          {topicsLoaded && (
                                            <span className="text-xs text-muted-foreground">{chTopics.length} topic{chTopics.length === 1 ? '' : 's'}</span>
                                          )}
                                        </button>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          <button onClick={() => openAddTopic(chapter)} title="Add topic" className={`${actionBtn} text-green-600 hover:text-green-800 hover:bg-green-50`}>
                                            <Icon name="Plus" size={14} />
                                          </button>
                                          <button onClick={() => handleEditChapter(chapter)} title="Edit chapter" className={`${actionBtn} text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50`}>
                                            <Icon name="Edit" size={14} />
                                          </button>
                                          <button onClick={() => handleDeleteChapter(chapter.id, chapter.subjectId)} title="Delete chapter" className={`${actionBtn} text-red-600 hover:text-red-900 hover:bg-red-50`}>
                                            <Icon name="Trash2" size={14} />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Topics */}
                                      {cOpen && (
                                        <div className="pl-10 pr-4 pb-2">
                                          {topicsLoading ? (
                                            <div className="py-1 text-sm text-muted-foreground">Loading topics…</div>
                                          ) : chTopics.length === 0 ? (
                                            <div className="py-1 text-sm text-muted-foreground">
                                              No topics yet.{' '}
                                              <button onClick={() => openAddTopic(chapter)} className="text-blue-600 hover:underline">Add one</button>
                                            </div>
                                          ) : (
                                            <div className="divide-y divide-gray-100">
                                              {chTopics.map((topic) => (
                                                <div key={topic.id} className="flex items-center justify-between py-2">
                                                  <button
                                                    onClick={() => navigate(`/topic-materials/${topic.id}`, { state: { topic } })}
                                                    title="Open materials"
                                                    className="flex items-center gap-2 min-w-0 text-left group flex-1"
                                                  >
                                                    <Icon name="List" size={14} className="text-muted-foreground flex-shrink-0" />
                                                    <span className="text-sm text-foreground truncate group-hover:text-primary group-hover:underline">{topic.name}</span>
                                                    {topic.code && <span className="text-xs text-muted-foreground">({topic.code})</span>}
                                                  </button>
                                                  <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button onClick={() => handleEditTopic(topic)} title="Edit topic" className={`${actionBtn} text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50`}>
                                                      <Icon name="Edit" size={14} />
                                                    </button>
                                                    <button onClick={() => handleDeleteTopic(topic.id, topic.chapterId)} title="Delete topic" className={`${actionBtn} text-red-600 hover:text-red-900 hover:bg-red-50`}>
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
          >
            Reload Page
          </Button>
        </div>
      </PageLayout>
    );
  }
};

export default CourseManagement;