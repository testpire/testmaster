// Lightweight client-side format validators.
//
// These are pre-submit guards only — the TestPire backend remains the source of
// truth (e.g. the username column is constrained to a valid email server-side).
// The goal is to surface format constraints up front instead of after a 400.

/**
 * True if `value` looks like an email address (`local@domain.tld`).
 * Intentionally permissive — it mirrors the backend's "must be an email" intent
 * without trying to fully implement RFC 5322.
 */
export const isValidEmail = (value) => {
  if (typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

/**
 * True if `value` is a plausible phone number: an optional leading `+`, then
 * digits / spaces / dashes / dots / parentheses, totalling 7–15 digits.
 * Kept deliberately lenient so we only reject obvious garbage (e.g. letters),
 * not legitimate international formats.
 */
export const isValidPhone = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};
