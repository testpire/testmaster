import React, { useState, useEffect } from 'react';
import { newTestService } from '../../../services/newTestService';
import { courseService } from '../../../services/courseService';
import { newBatchService } from '../../../services/newBatchService';
import { newUserService } from '../../../services/newUserService';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import DateTimePicker from '../../../components/ui/DateTimePicker';
import {
  TARGET_TYPES,
  TARGET_TYPE_LABEL,
  TARGET_TYPE_ICON,
  formatDateTime,
  toUtcIso,
  getTestAvailability,
  isNotTakeable
} from '../testConstants';

// Assign a test to a COURSE, BATCH or STUDENT and manage existing assignments.
// Assignment is resolved server-side: a COURSE assignment reaches every batch and
// student in it; a BATCH assignment reaches every student in it. Each assignment
// can carry its own availability window — but that window can only *narrow* within
// the test's own window, never widen it (see the guard banner below).
//
// `onReopenWindow` (optional) is invoked by the "Reopen / extend test window" CTA in
// the guard banner — the parent closes this modal and opens the test's edit form so
// the user can fix the test-level window that's blocking the assignment.
const AssignTestModal = ({ isOpen, onClose, onChanged, test, onReopenWindow }) => {
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);

  const [form, setForm] = useState({
    targetType: 'COURSE',
    courseId: '', // used to drive batch/student dropdowns
    targetId: '',
    availableFrom: '',
    availableUntil: ''
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setForm({ targetType: 'COURSE', courseId: '', targetId: '', availableFrom: '', availableUntil: '' });
    setError('');
    loadAssignments();
    loadCourses();
    // Batches are institute-level and independent of courses — load them all up front.
    loadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, test?.id]);

  // For the STUDENT target, narrow the student list to the chosen course.
  useEffect(() => {
    if (form.targetType !== 'STUDENT' || !form.courseId) {
      setStudents([]);
      return;
    }
    loadStudents(form.courseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.courseId, form.targetType]);

  const loadAssignments = async () => {
    setLoading(true);
    const { data } = await newTestService.listAssignments(test.id);
    setAssignments(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const loadCourses = async () => {
    const { data } = await courseService.getCourses({ page: 0, size: 100 });
    setCourses(Array.isArray(data) ? data : []);
  };

  const loadBatches = async () => {
    const { data } = await newBatchService.getAllBatches();
    setBatches(Array.isArray(data) ? data : []);
  };

  const loadStudents = async (courseId) => {
    const { data } = await newUserService.searchStudents({ courseId }, { page: 0, size: 100 });
    setStudents(Array.isArray(data) ? data : []);
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleTargetTypeChange = (targetType) => {
    setForm((prev) => ({ ...prev, targetType, targetId: '' }));
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setError('');

    // For COURSE, targetId IS the course; for BATCH/STUDENT it's the chosen batch/student.
    const targetId = form.targetType === 'COURSE' ? form.courseId : form.targetId;
    if (!targetId) {
      setError(`Please choose a ${TARGET_TYPE_LABEL[form.targetType].toLowerCase()}.`);
      return;
    }
    if (form.availableFrom && form.availableUntil &&
        new Date(form.availableUntil) <= new Date(form.availableFrom)) {
      setError('"Available until" must be after "Available from"');
      return;
    }

    const payload = { targetType: form.targetType, targetId: Number(targetId) };
    if (form.availableFrom) payload.availableFrom = toUtcIso(form.availableFrom);
    if (form.availableUntil) payload.availableUntil = toUtcIso(form.availableUntil);

    setSaving(true);
    const { error: assignErr } = await newTestService.assignTest(test.id, payload);
    setSaving(false);
    if (assignErr) {
      setError(assignErr.message || 'Failed to assign test');
      return;
    }
    setForm((prev) => ({ ...prev, targetId: '', availableFrom: '', availableUntil: '' }));
    await loadAssignments();
    onChanged?.();
  };

  const handleRemove = async (assignment) => {
    if (!window.confirm(`Remove this ${assignment.targetType?.toLowerCase()} assignment?`)) return;
    const previous = assignments;
    setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
    const { error: delErr } = await newTestService.removeAssignment(test.id, assignment.id);
    if (delErr) {
      setAssignments(previous);
      setError(delErr.message || 'Failed to remove assignment');
    } else {
      onChanged?.();
    }
  };

  const inputCls =
    'w-full px-3 py-2 border border-input rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/70 focus:border-primary';

  // The test's own availability gate. When it isn't currently takeable (draft, not
  // yet open, or expired), an assignment — however well-timed its own window — won't
  // let anyone take the test. Warn loudly so the assign action isn't a silent no-op.
  const availability = getTestAvailability(test);
  const blockedByTestWindow = isNotTakeable(availability.state);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Test"
      description={test?.title}
      size="lg"
      footer={
        <Button type="button" variant="outline" onClick={onClose}>
          Done
        </Button>
      }
    >
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center space-x-2">
              <Icon name="AlertCircle" size={16} className="text-destructive" />
              <p className="text-destructive text-sm font-medium">{error}</p>
            </div>
          )}

          {blockedByTestWindow && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2 ${
                availability.state === 'EXPIRED'
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-warning/15 border-warning/40'
              }`}
            >
              <Icon
                name="AlertTriangle"
                size={16}
                className={`mt-0.5 ${availability.state === 'EXPIRED' ? 'text-destructive' : 'text-warning'}`}
              />
              <div className="min-w-0 space-y-2">
                <p className={`text-sm ${availability.state === 'EXPIRED' ? 'text-destructive' : 'text-warning'}`}>
                  {availability.state === 'DRAFT' ? (
                    <>
                      This test is still a <strong>draft</strong>. Assigning it won&apos;t let anyone
                      take it until you publish it.
                    </>
                  ) : availability.state === 'SCHEDULED' ? (
                    <>
                      This test&apos;s own window hasn&apos;t opened yet ({availability.detail.replace(/ —.*/, '')}).
                      Assignments can only narrow <em>within</em> that window — no one can take it before it opens.
                    </>
                  ) : (
                    <>
                      This test&apos;s own window <strong>expired</strong> ({formatDateTime(test?.availableUntil)}).
                      Assigning it won&apos;t let anyone take it until you reopen the test window.
                    </>
                  )}
                </p>
                {availability.state !== 'DRAFT' && onReopenWindow && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onReopenWindow}
                    iconName="CalendarClock"
                    iconPosition="left"
                  >
                    Reopen / extend test window
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* New assignment form */}
          <form onSubmit={handleAssign} className="space-y-3 border border-border rounded-lg p-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Assign to</label>
              <div className="flex gap-2">
                {TARGET_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTargetTypeChange(t)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                      form.targetType === t
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-border text-muted-foreground hover:bg-muted/30'
                    }`}
                  >
                    <Icon name={TARGET_TYPE_ICON[t]} size={16} />
                    {TARGET_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
              {form.targetType === 'COURSE' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Reaches every batch and student in the course automatically.
                </p>
              )}
              {form.targetType === 'BATCH' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Reaches every student in the chosen batch.
                </p>
              )}
            </div>

            {/* Course selector — for COURSE target (the target itself) and STUDENT
                target (to scope the student list). Batches are independent, so the
                BATCH target skips this. */}
            {form.targetType !== 'BATCH' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Course {form.targetType === 'STUDENT' && <span className="text-muted-foreground">(to find the student)</span>}
                </label>
                <select
                  value={form.courseId}
                  onChange={(e) => setForm((prev) => ({ ...prev, courseId: e.target.value, targetId: '' }))}
                  className={inputCls}
                >
                  <option value="">— Select course —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.targetType === 'BATCH' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Batch</label>
                <select
                  value={form.targetId}
                  onChange={(e) => setField('targetId', e.target.value)}
                  className={inputCls}
                >
                  <option value="">— Select batch —</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.targetType === 'STUDENT' && form.courseId && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Student</label>
                <select
                  value={form.targetId}
                  onChange={(e) => setField('targetId', e.target.value)}
                  className={inputCls}
                >
                  <option value="">— Select student —</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {`${s.firstName || ''} ${s.lastName || ''}`.trim() || s.username || s.email || `#${s.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-foreground">
                Limit this assignment to a time window{' '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2 flex items-start gap-1">
                <Icon name="Info" size={12} className="mt-0.5 flex-shrink-0" />
                Narrows <em>within</em> the test&apos;s own window
                {(test?.availableFrom || test?.availableUntil) && (
                  <span>
                    {' '}({formatDateTime(test?.availableFrom)} → {formatDateTime(test?.availableUntil)})
                  </span>
                )}
                . Leave blank to use the test&apos;s window.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">From</label>
                  <DateTimePicker
                    mode="datetime"
                    value={form.availableFrom}
                    onChange={(v) => setField('availableFrom', v)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Until</label>
                  <DateTimePicker
                    mode="datetime"
                    value={form.availableUntil}
                    onChange={(v) => setField('availableUntil', v)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="default"
                disabled={saving}
                iconName={saving ? 'Loader2' : 'Plus'}
                iconPosition="left"
                className={saving ? 'animate-pulse' : ''}
              >
                {saving ? 'Assigning...' : 'Assign'}
              </Button>
            </div>
          </form>

          {/* Existing assignments */}
          <div>
            <h3 className="text-sm font-display font-semibold text-foreground mb-2">
              Current Assignments ({assignments.length})
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                Not assigned to anyone yet.
              </p>
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon name={TARGET_TYPE_ICON[a.targetType] || 'Tag'} size={18} className="text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {a.targetName || `${TARGET_TYPE_LABEL[a.targetType] || a.targetType} #${a.targetId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {TARGET_TYPE_LABEL[a.targetType] || a.targetType}
                          {(a.availableFrom || a.availableUntil) && (
                            <>
                              {' · '}
                              {formatDateTime(a.availableFrom)} → {formatDateTime(a.availableUntil)}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(a)}
                      className="text-destructive hover:opacity-70 flex-shrink-0"
                      title="Remove assignment"
                    >
                      <Icon name="Trash2" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </Modal>
  );
};

export default AssignTestModal;
