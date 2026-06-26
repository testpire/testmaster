// Attempt lifecycle + validity helpers, shared by the student test-taking and
// test-result pages so both classify an attempt the same way.
//
// The :attemptId in those routes comes straight from the URL and is untrusted —
// it can be mistyped, enumerated (ids are sequential), or belong to a different
// student. The backend already scopes GET /student/tests/attempts/{id} to the
// JWT user and returns HTTP 400 for a missing/unowned id, so there's no data
// leak to close here; these helpers exist to turn that rejection into a clean
// "not available" experience instead of a broken/half-rendered page.

const norm = (value) =>
  (value == null ? '' : String(value)).trim().toUpperCase().replace(/[\s-]+/g, '_');

// Read the status off an attempt payload, tolerating the field aliases the
// backend has used (`status` / `attemptStatus`).
export const getAttemptStatus = (attempt) =>
  norm(attempt?.status ?? attempt?.attemptStatus);

// Terminal = the attempt is finished; a result exists and it can no longer be
// taken. Loading one of these on /test-taking should send the student to the
// result page.
const TERMINAL = new Set([
  'SUBMITTED',
  'COMPLETED',
  'GRADED',
  'EXPIRED',
  'TIMED_OUT',
  'ABANDONED',
  'CANCELLED',
]);

// In-progress = still open for answering. Loading one of these on /test-result
// should send the student back to the runner to finish it.
const IN_PROGRESS = new Set([
  'IN_PROGRESS',
  'INPROGRESS',
  'IN_PROG',
  'STARTED',
  'ACTIVE',
  'RESUMED',
  'NOT_SUBMITTED',
]);

// Both predicates require *known* membership and default to false, so an absent
// or unrecognised status leaves each page on its own route rather than bouncing
// a valid attempt to the wrong view.
export const isAttemptTerminal = (status) => TERMINAL.has(status);
export const isAttemptInProgress = (status) => IN_PROGRESS.has(status);

// Does the payload actually look like an attempt we can render? Guards against a
// `{ success:false, ... }` failure envelope (or an empty body) slipping through
// as "data". The backend returns HTTP 400 for a missing/unowned attempt, but be
// tolerant in case a 200-wrapped failure shows up later.
export const isUsableAttempt = (data) =>
  !!data &&
  data.success !== false &&
  (data.attemptId != null ||
    data.id != null ||
    data.status != null ||
    data.attemptStatus != null ||
    Array.isArray(data.questions) ||
    Array.isArray(data.test?.questions));

// Classify a getAttempt() failure: transient (network / 5xx — worth retrying and
// shown as a retryable error) vs. not-available (400 / 404 / other 4xx — the id
// is invalid or not the student's, which triggers the redirect path).
export const isTransientAttemptError = (error) =>
  !!error &&
  (error.isNetworkError === true ||
    error.isServerError === true ||
    Number(error.status) >= 500);
