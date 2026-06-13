// Shared helpers for unwrapping the TestPire API response envelope `{ message, success, data }`.
// Payloads sometimes nest further (`data.data`, `data.<entityKey>`, `data.content`, or a
// bare array), so these normalize defensively. Used across the new* services.

// Pull a single object out of the response envelope.
export const unwrapOne = (data) => data?.data ?? data ?? null;

// Pull a list out of whatever shape the API returns. Pass any entity-specific keys to
// check first (e.g. 'tests', 'materials', 'batches'); falls back to content/items/data.
export const unwrapList = (data, ...keys) => {
  const body = data?.data ?? data ?? {};
  if (Array.isArray(body)) return body;
  for (const k of keys) {
    const v = body?.[k];
    if (v != null) return v;
  }
  return body?.content || body?.items || body?.data || [];
};

// --- Error message extraction -------------------------------------------------
// Spring's MethodArgumentNotValidException renders its message as one long string,
// e.g. "Validation failed for argument [0] ... default message [username] ...
// default message [Username must be a valid email]". The human-readable constraint
// text lives in the `default message [...]` segments. Field-name resolvables render
// as a bare token (e.g. "username"); the real constraint messages read as sentences
// (they contain whitespace), so we keep those.
const SPRING_DEFAULT_MSG = /default message \[([^\]]*)\]/g;

export const parseSpringValidationMessage = (raw) => {
  if (typeof raw !== 'string' || !raw.includes('default message [')) return null;
  const all = [...raw.matchAll(SPRING_DEFAULT_MSG)]
    .map((m) => m[1]?.trim())
    .filter(Boolean);
  if (!all.length) return null;
  const sentences = all.filter((m) => /\s/.test(m));
  const picked = sentences.length ? sentences : all.slice(-1);
  return [...new Set(picked)].join('; ') || null;
};

// Best human-readable message for an axios error, in priority order:
//   1. structured field errors, if the backend ever sends them (`errors` array/map)
//   2. backend `message`/`error` — parsed for readability if it's a Spring dump
//   3. axios's own error message
// Returns null when nothing usable is found, so callers can choose a fallback.
export const extractApiErrorMessage = (error) => {
  const data = error?.response?.data;

  // 1. Structured field errors: array of { field, defaultMessage } or a field→msg map.
  const errs = data?.errors;
  if (errs && typeof errs === 'object') {
    const msgs = Array.isArray(errs)
      ? errs.map((e) => e?.defaultMessage || e?.message || (typeof e === 'string' ? e : null))
      : Object.values(errs).flat();
    const clean = msgs.filter(Boolean);
    if (clean.length) return [...new Set(clean)].join('; ');
  }

  // 2. Raw backend message — `message` first (the validation dump lives here),
  //    then `error`. Parse Spring dumps down to the readable constraint text.
  const raw = data?.message || data?.error;
  if (raw) return parseSpringValidationMessage(raw) || raw;

  return error?.message || null;
};
