import React, { useEffect, useState } from 'react';
import { newBatchService } from '../../services/newBatchService';
import Icon from '../AppIcon';

// Reusable multi-row editor for student enrollments (course + batch pairs).
// A student can be enrolled in several courses, each optionally pinned to one of that
// course's batches. Used by the admin student modal and the student self-service profile.
//
// `value` is a controlled array of rows: { courseId, batchId, courseName?, batchName? }
// where courseId/batchId may be '' (unset). `onChange` receives the updated array.
// Use `toEnrollmentPayload(rows)` to turn rows into the API shape [{ courseId, batchId }].

export const toEnrollmentPayload = (rows = []) =>
  rows
    .filter((r) => r && r.courseId !== '' && r.courseId != null)
    .map((r) => ({
      courseId: Number(r.courseId),
      batchId: r.batchId !== '' && r.batchId != null ? Number(r.batchId) : null
    }));

const inputCls =
  'w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50';

const EnrollmentEditor = ({ value = [], onChange, courses = [], disabled = false }) => {
  // Cache of batches keyed by courseId so switching/re-rendering rows doesn't refetch.
  // Value: array of batches, or 'loading' while in flight.
  const [batchesByCourse, setBatchesByCourse] = useState({});

  // Lazily load batches for every course currently referenced by a row.
  useEffect(() => {
    const idsNeeded = Array.from(
      new Set(value.map((r) => r?.courseId).filter((id) => id !== '' && id != null))
    );
    idsNeeded.forEach((courseId) => {
      if (batchesByCourse[courseId] !== undefined) return; // cached or loading
      setBatchesByCourse((prev) => ({ ...prev, [courseId]: 'loading' }));
      newBatchService.getBatchesByCourse(courseId).then(({ data }) => {
        setBatchesByCourse((prev) => ({ ...prev, [courseId]: Array.isArray(data) ? data : [] }));
      });
    });
  }, [value, batchesByCourse]);

  const updateRow = (index, patch) => {
    const next = value.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange?.(next);
  };

  const addRow = () => onChange?.([...value, { courseId: '', batchId: '' }]);

  const removeRow = (index) => onChange?.(value.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No courses added yet. Add a course to enroll the student.
        </p>
      )}

      {value.map((row, index) => {
        const batches = batchesByCourse[row.courseId];
        const loadingBatches = batches === 'loading';
        const batchList = Array.isArray(batches) ? batches : [];
        return (
          <div
            key={index}
            className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end border border-border rounded-md p-3 bg-muted/30"
          >
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Course</label>
              <select
                value={row.courseId ?? ''}
                onChange={(e) =>
                  // Switching course clears the previously selected batch.
                  updateRow(index, { courseId: e.target.value, batchId: '' })
                }
                disabled={disabled}
                className={inputCls}
              >
                <option value="">— Select course —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.code ? ` (${c.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Batch</label>
              <select
                value={row.batchId ?? ''}
                onChange={(e) => updateRow(index, { batchId: e.target.value })}
                disabled={disabled || !row.courseId || loadingBatches}
                className={inputCls}
              >
                <option value="">
                  {!row.courseId
                    ? '— Select a course first —'
                    : loadingBatches
                    ? 'Loading batches...'
                    : batchList.length === 0
                    ? 'No batches yet'
                    : '— No batch —'}
                </option>
                {batchList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}{b.code ? ` (${b.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => removeRow(index)}
              disabled={disabled}
              title="Remove course"
              className="h-[42px] w-10 flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-50"
            >
              <Icon name="Trash2" size={18} />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addRow}
        disabled={disabled}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline disabled:opacity-50"
      >
        <Icon name="Plus" size={16} />
        Add course
      </button>
    </div>
  );
};

export default EnrollmentEditor;
