import React from 'react';
import Icon from '../AppIcon';
import { formatTimetable } from '../../utils/timetable';

// Decoupled course + batch assignment for a student. Courses and batches are now
// independent: a student has a set of courses (each carrying a fee) and a separate set
// of batches (each carrying a weekly timetable). This editor exposes two dropdowns —
// one to add a course, one to add a batch — and lists each selection with its details.
//
// `value` is a controlled { courseIds: number[], batchIds: number[] }.
// `onChange` receives the updated object. `courses` / `batches` are the option lists.

const fmtFee = (f) => (f == null || f === '' ? null : `₹${Number(f).toLocaleString('en-IN')}`);

const selectCls =
  'w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50';

const StudentEnrollmentFields = ({
  courses = [],
  batches = [],
  value = { courseIds: [], batchIds: [] },
  onChange,
  loadingCourses = false,
  loadingBatches = false,
  disabled = false,
}) => {
  const courseIds = (value?.courseIds || []).map(Number);
  const batchIds = (value?.batchIds || []).map(Number);

  const emit = (patch) => onChange?.({ courseIds, batchIds, ...patch });

  const addCourse = (id) => {
    const n = Number(id);
    if (!n || courseIds.includes(n)) return;
    emit({ courseIds: [...courseIds, n] });
  };
  const removeCourse = (id) => emit({ courseIds: courseIds.filter((c) => c !== Number(id)) });

  const addBatch = (id) => {
    const n = Number(id);
    if (!n || batchIds.includes(n)) return;
    emit({ batchIds: [...batchIds, n] });
  };
  const removeBatch = (id) => emit({ batchIds: batchIds.filter((b) => b !== Number(id)) });

  const courseById = (id) => courses.find((c) => Number(c.id) === Number(id));
  const batchById = (id) => batches.find((b) => Number(b.id) === Number(id));

  const availableCourses = courses.filter((c) => !courseIds.includes(Number(c.id)));
  const availableBatches = batches.filter((b) => !batchIds.includes(Number(b.id)));

  return (
    <div className="space-y-5">
      {/* ---- Courses ---- */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Icon name="BookOpen" size={14} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Courses</span>
        </div>

        <select
          value=""
          onChange={(e) => { addCourse(e.target.value); e.target.value = ''; }}
          disabled={disabled || loadingCourses || availableCourses.length === 0}
          className={selectCls}
        >
          <option value="">
            {loadingCourses
              ? 'Loading courses...'
              : availableCourses.length === 0
              ? (courses.length === 0 ? 'No courses available' : 'All courses added')
              : '+ Add a course'}
          </option>
          {availableCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.code ? ` (${c.code})` : ''}{fmtFee(c.fee) ? ` — ${fmtFee(c.fee)}` : ''}
            </option>
          ))}
        </select>

        {courseIds.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No courses assigned yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {courseIds.map((id) => {
              const c = courseById(id);
              return (
                <li
                  key={id}
                  className="flex items-center justify-between gap-2 border border-border rounded-md px-3 py-2 bg-muted/30"
                >
                  <div className="min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground truncate">
                      {c ? c.name : `Course #${id}`}
                    </span>
                    {c?.code && <span className="text-xs text-muted-foreground">({c.code})</span>}
                    {fmtFee(c?.fee) && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                        <Icon name="IndianRupee" size={11} />{fmtFee(c.fee)}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCourse(id)}
                    disabled={disabled}
                    title="Remove course"
                    className="text-muted-foreground hover:text-destructive disabled:opacity-50 flex-shrink-0"
                  >
                    <Icon name="X" size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ---- Batches ---- */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Icon name="Users" size={14} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Batches</span>
        </div>

        <select
          value=""
          onChange={(e) => { addBatch(e.target.value); e.target.value = ''; }}
          disabled={disabled || loadingBatches || availableBatches.length === 0}
          className={selectCls}
        >
          <option value="">
            {loadingBatches
              ? 'Loading batches...'
              : availableBatches.length === 0
              ? (batches.length === 0 ? 'No batches available' : 'All batches added')
              : '+ Add a batch'}
          </option>
          {availableBatches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}{b.code ? ` (${b.code})` : ''}
            </option>
          ))}
        </select>

        {batchIds.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No batches assigned yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {batchIds.map((id) => {
              const b = batchById(id);
              const slots = formatTimetable(b?.timetable);
              return (
                <li
                  key={id}
                  className="flex items-start justify-between gap-2 border border-border rounded-md px-3 py-2 bg-muted/30"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">
                        {b ? b.name : `Batch #${id}`}
                      </span>
                      {b?.code && <span className="text-xs text-muted-foreground">({b.code})</span>}
                    </div>
                    {slots.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {slots.map((slot, si) => (
                          <span
                            key={si}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-violet-50 text-violet-700"
                          >
                            <Icon name="Clock" size={11} />{slot}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">No timetable set</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBatch(id)}
                    disabled={disabled}
                    title="Remove batch"
                    className="text-muted-foreground hover:text-destructive disabled:opacity-50 flex-shrink-0"
                  >
                    <Icon name="X" size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default StudentEnrollmentFields;
