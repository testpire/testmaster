// Helpers for batch timetables (TimetableSlot[] in the API: { days, startTime, endTime }).
// A batch's schedule is a list of slots, each covering one or more weekdays and a
// start/end time.
//
// The backend stores/returns days as 3-letter UPPERCASE abbreviations (MON..SUN) and
// requires startTime/endTime in 24-hour "HH:mm" (NOT "HH:mm:ss" — that 400s, and a full
// day name like "MONDAY" 500s). So we send exactly those values. (Verified against the
// live API 2026-06-16.)

// Canonical day values (the API's 3-letter codes) in week order.
export const WEEKDAYS = [
  { value: 'MON', short: 'Mon' },
  { value: 'TUE', short: 'Tue' },
  { value: 'WED', short: 'Wed' },
  { value: 'THU', short: 'Thu' },
  { value: 'FRI', short: 'Fri' },
  { value: 'SAT', short: 'Sat' },
  { value: 'SUN', short: 'Sun' },
];

const DAY_ORDER = WEEKDAYS.reduce((acc, d, i) => ({ ...acc, [d.value]: i }), {});

// Short label for a single day value, tolerant of casing / partial input.
export const dayLabel = (day) => {
  if (!day) return '';
  const norm = String(day).trim().toUpperCase();
  const found = WEEKDAYS.find((d) => d.value === norm || d.short.toUpperCase() === norm);
  if (found) return found.short;
  // Fall back to a title-cased first-three-letters guess for unknown values.
  return norm.charAt(0) + norm.slice(1, 3).toLowerCase();
};

// Trim seconds off "HH:mm:ss" → "HH:mm"; leave other strings as-is.
export const fmtTime = (t) => {
  if (!t) return '';
  const s = String(t);
  const m = s.match(/^(\d{1,2}:\d{2})/);
  return m ? m[1] : s;
};

// Order a slot's days Monday→Sunday and render as short labels: "Mon, Wed, Fri".
const fmtDays = (days = []) =>
  [...days]
    .sort((a, b) => (DAY_ORDER[String(a).toUpperCase()] ?? 99) - (DAY_ORDER[String(b).toUpperCase()] ?? 99))
    .map(dayLabel)
    .filter(Boolean)
    .join(', ');

// One slot → "Mon, Wed 18:00–19:30" (omits the time range when absent).
export const formatSlot = (slot) => {
  if (!slot) return '';
  const days = fmtDays(Array.isArray(slot.days) ? slot.days : []);
  const start = fmtTime(slot.startTime);
  const end = fmtTime(slot.endTime);
  const time = start && end ? `${start}–${end}` : start || end || '';
  return [days, time].filter(Boolean).join(' ');
};

// Whole timetable → array of per-slot strings (drops empty slots). Use .join(' · ')
// for a compact one-line summary, or render as a list.
export const formatTimetable = (timetable = []) =>
  (Array.isArray(timetable) ? timetable : [])
    .map(formatSlot)
    .filter(Boolean);

// Coerce to the exact API shape before sending: at least one day is required per slot
// (the backend rejects day-less slots), and times must be "HH:mm" (seconds stripped).
export const cleanTimetable = (timetable = []) =>
  (Array.isArray(timetable) ? timetable : [])
    .map((s) => ({
      days: Array.isArray(s?.days) ? s.days.filter(Boolean) : [],
      startTime: fmtTime(s?.startTime),
      endTime: fmtTime(s?.endTime),
    }))
    .filter((s) => s.days.length > 0);
