// Shared enums + display helpers for the Test Management feature.

// Test lifecycle status as returned by the backend.
export const TEST_STATUSES = ['DRAFT', 'PUBLISHED'];

export const TEST_STATUS_BADGE = {
  DRAFT: 'bg-warning/15 text-warning',
  PUBLISHED: 'bg-success/15 text-success',
  ARCHIVED: 'bg-muted text-muted-foreground',
  CLOSED: 'bg-muted text-muted-foreground'
};

// Test type (CreateTestRequestDto.type). TEST = a graded test/exam; PRACTICE = a
// Daily Practice Problem (DPP) set — unlimited attempts within the window with
// answers revealed for self-study. Set at creation only (no `type` on update).
export const TEST_TYPES = ['TEST', 'PRACTICE'];

export const TEST_TYPE_LABEL = {
  TEST: 'Test',
  PRACTICE: 'Daily Practice'
};

// Longer label for selectors/empty states.
export const TEST_TYPE_LABEL_LONG = {
  TEST: 'Test / Exam',
  PRACTICE: 'Daily Practice Problems (DPP)'
};

export const TEST_TYPE_BADGE = {
  TEST: 'bg-primary/10 text-primary',
  PRACTICE: 'bg-accent/15 text-accent'
};

export const TEST_TYPE_ICON = {
  TEST: 'ClipboardList',
  PRACTICE: 'Repeat'
};

// Normalize an API value to one of TEST_TYPES (defaults to TEST).
export const normalizeTestType = (value) =>
  String(value || '').toUpperCase() === 'PRACTICE' ? 'PRACTICE' : 'TEST';

// ---- Result / solution reveal (RevealTrigger) ------------------------------
// A test has two independent reveal axes, each a RevealTrigger evaluated
// server-side at read time:
//   • scoreReveal    — gates the overall score, pass/fail, and per-question
//                      marks/correctness. Cannot be DURING_ATTEMPT.
//   • solutionReveal — gates the answer key (correct option ids + explanation).
//                      DURING_ATTEMPT is valid only on a PRACTICE test.
// The legacy boolean `showAnswers` (true→solution IMMEDIATE, false→NEVER) is
// superseded by these two fields; we no longer send it.
export const REVEAL_TRIGGERS = ['IMMEDIATE', 'ON_PUBLISH', 'SCHEDULED', 'NEVER', 'DURING_ATTEMPT'];

export const REVEAL_TRIGGER_LABEL = {
  IMMEDIATE: 'Immediately after submitting',
  ON_PUBLISH: 'When I publish results',
  SCHEDULED: 'At a scheduled time',
  NEVER: 'Never',
  DURING_ATTEMPT: 'Instantly while practising',
};

// Dropdown options. Score excludes DURING_ATTEMPT; solution offers it for PRACTICE only.
export const scoreRevealOptions = () =>
  ['IMMEDIATE', 'ON_PUBLISH', 'SCHEDULED', 'NEVER'].map((v) => ({ value: v, label: REVEAL_TRIGGER_LABEL[v] }));

export const solutionRevealOptions = (isPractice) =>
  [...(isPractice ? ['DURING_ATTEMPT'] : []), 'IMMEDIATE', 'ON_PUBLISH', 'SCHEDULED', 'NEVER'].map((v) => ({
    value: v,
    label: REVEAL_TRIGGER_LABEL[v],
  }));

// Backend defaults per test type — used to seed the form and as a hydration fallback.
export const defaultReveals = (type) =>
  normalizeTestType(type) === 'PRACTICE'
    ? { scoreReveal: 'IMMEDIATE', solutionReveal: 'DURING_ATTEMPT' }
    : { scoreReveal: 'IMMEDIATE', solutionReveal: 'NEVER' };

// Is an ISO timestamp in the future? Treats a zone-less string as UTC (matching
// formatDateTime / the backend), so a pending scheduled reveal reads correctly.
export const isFutureIso = (value) => {
  if (!value) return false;
  let s = String(value);
  if (!/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) s = s.replace(' ', 'T') + 'Z';
  const t = new Date(s).getTime();
  return !Number.isNaN(t) && t > new Date().getTime();
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
// (possibly with seconds/zone). Trim to the minute for the control.
export const toDatetimeLocal = (value) => (value ? String(value).slice(0, 16) : '');

// Convert a datetime-local string ("yyyy-MM-ddTHH:mm") to a full UTC ISO string
// before sending to the API. The input is in the browser's local timezone but carries
// no offset — without this the backend (UTC) misinterprets the time by the user's
// UTC offset (e.g. IST is 5.5 h off). Returns null for empty/invalid values.
export const toUtcIso = (localValue) => {
  if (!localValue) return null;
  const d = new Date(localValue);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

// The backend stores/returns times in UTC. Render them in the browser's local
// timezone (the inverse of toUtcIso, which sends local time as UTC). If the ISO
// string carries no zone designator, treat it as UTC by appending 'Z' — otherwise
// new Date() would (mis)interpret it as local time.
export const formatDateTime = (value) => {
  if (!value) return '—';
  let s = String(value);
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s);
  if (!hasZone) s = s.replace(' ', 'T') + 'Z';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

// Parse an API timestamp the same way formatDateTime / isFutureIso do: a zone-less
// string is treated as UTC (the backend stores UTC), so comparisons against `now`
// don't drift by the viewer's offset. Returns a Date or null.
const parseApiDate = (value) => {
  if (!value) return null;
  let s = String(value);
  if (!/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) s = s.replace(' ', 'T') + 'Z';
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

// The single source of truth for "can a student take this test right now", combining
// the publish status with the test-level availability window. This is the gate an
// assignment window can only *narrow*, never widen — so an EXPIRED/SCHEDULED/DRAFT
// test stays unreachable no matter what window an assignment carries. The detail page
// surfaces it as a pill and the Assign flow guards against the not-takeable states.
//   DRAFT       — not published yet; invisible to students regardless of window.
//   SCHEDULED   — published, but availableFrom is still in the future.
//   OPEN        — published and inside the window (or no window set).
//   EXPIRED     — published, but availableUntil has passed.
//   ALWAYS_OPEN — published with no window at all (a kind of OPEN; flagged for copy).
// Returns { state, label, detail } — `detail` is a short human sentence for tooltips/banners.
export const getTestAvailability = (test) => {
  const status = (test?.status || '').toUpperCase();
  if (status !== 'PUBLISHED') {
    return {
      state: 'DRAFT',
      label: 'Draft',
      detail: 'Not published yet — students can’t see or take it. Publish to make it takeable.',
    };
  }

  const from = parseApiDate(test?.availableFrom);
  const until = parseApiDate(test?.availableUntil);
  const now = new Date();

  if (from && from > now) {
    return {
      state: 'SCHEDULED',
      label: 'Scheduled',
      detail: `Opens ${formatDateTime(test.availableFrom)} — not takeable until then.`,
    };
  }
  if (until && until < now) {
    return {
      state: 'EXPIRED',
      label: 'Expired',
      detail: `Closed ${formatDateTime(test.availableUntil)} — students can no longer take it.`,
    };
  }
  if (!from && !until) {
    return { state: 'ALWAYS_OPEN', label: 'Open', detail: 'Open with no time limit.' };
  }
  return {
    state: 'OPEN',
    label: 'Open now',
    detail: until ? `Open — closes ${formatDateTime(test.availableUntil)}.` : 'Open now.',
  };
};

// True when the test is *not* currently takeable — the states the Assign flow warns on.
export const isNotTakeable = (state) =>
  state === 'DRAFT' || state === 'SCHEDULED' || state === 'EXPIRED';

// Badge palette for the availability states (mirrors TEST_STATUS_BADGE tones).
export const TEST_AVAILABILITY_BADGE = {
  OPEN: 'bg-success/15 text-success',
  ALWAYS_OPEN: 'bg-success/15 text-success',
  SCHEDULED: 'bg-warning/15 text-warning',
  EXPIRED: 'bg-destructive/10 text-destructive',
  DRAFT: 'bg-warning/15 text-warning',
};
