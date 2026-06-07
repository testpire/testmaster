// Shared enums + display helpers for the Test Management feature.

// Test lifecycle status as returned by the backend.
export const TEST_STATUSES = ['DRAFT', 'PUBLISHED'];

export const TEST_STATUS_BADGE = {
  DRAFT: 'bg-amber-100 text-amber-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-slate-100 text-slate-500',
  CLOSED: 'bg-slate-100 text-slate-500'
};

// Assignment targets (AssignTestRequestDto.targetType).
export const TARGET_TYPES = ['COURSE', 'BATCH', 'STUDENT'];

export const TARGET_TYPE_LABEL = {
  COURSE: 'Course',
  BATCH: 'Batch',
  STUDENT: 'Student'
};

export const TARGET_TYPE_ICON = {
  COURSE: 'BookOpen',
  BATCH: 'Users',
  STUDENT: 'GraduationCap'
};

// Human-friendly labels for SCREAMING_SNAKE_CASE enum values.
export const prettyEnum = (value) =>
  (value || '')
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

// Question images come back two ways: the question-bank search returns a full S3
// URL, while the test-detail payload returns a bucket-relative key. Resolve the
// relative form against the known questions bucket so <img> works in both places.
const QUESTION_IMAGE_BASE = 'https://testpire2025-questions.s3.ap-south-1.amazonaws.com/';
export const resolveImagePath = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return QUESTION_IMAGE_BASE + String(path).replace(/^\/+/, '');
};

// An <input type="datetime-local"> wants "yyyy-MM-ddTHH:mm"; the API returns ISO
// (possibly with seconds/zone). Trim to the minute for the control, and pass the
// control value straight back to the API (it accepts second-less ISO).
export const toDatetimeLocal = (value) => (value ? String(value).slice(0, 16) : '');

export const formatDateTime = (value) => {
  if (!value) return '—';
  const s = String(value);
  const date = s.slice(0, 10);
  const time = s.slice(11, 16);
  return time ? `${date} ${time}` : date;
};

// Is the test currently inside its availability window?
export const isWithinWindow = (from, until) => {
  // Avoid Date.now() drift concerns — compare ISO strings lexicographically is
  // unreliable across zones, so use Date parsing here (runtime only).
  const now = new Date();
  if (from && new Date(from) > now) return false;
  if (until && new Date(until) < now) return false;
  return true;
};
