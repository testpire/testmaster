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
