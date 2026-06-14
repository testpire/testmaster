// Page through an advanced-search service method until there are no more pages,
// accumulating every row. Used where the full set is needed (e.g. curriculum tree
// views, the institute switcher) rather than a single page.
//
// The TestPire `/search/advanced` endpoints cap pagination.size at 100, so we request
// <= 100 per page and concatenate rather than asking for one oversized page (which the
// backend rejects or silently clamps).
//
// `fn` receives a pagination object `{ page, size }` (0-based) and returns the service's
// `{ data, pagination, error }` envelope. Returns `{ data, error }`: `data` is every row
// gathered; `error` is the first error encountered, at which point paging stops and returns
// what it had. Stops when the service reports no more pages, on error, or after `maxPages`.
export const MAX_PAGE_SIZE = 100;

export const fetchAllPages = async (fn, { size = MAX_PAGE_SIZE, maxPages = 50 } = {}) => {
  const pageSize = Math.min(size, MAX_PAGE_SIZE);
  const all = [];

  for (let page = 0; page < maxPages; page += 1) {
    const { data, pagination, error } = (await fn({ page, size: pageSize })) || {};
    if (error) return { data: all, error };

    const batch = Array.isArray(data) ? data : [];
    all.push(...batch);

    let hasMore;
    if (pagination && pagination.hasMore != null) {
      hasMore = pagination.hasMore;
    } else if (pagination && pagination.totalPages != null) {
      hasMore = page < pagination.totalPages - 1;
    } else {
      // No metadata to go on: a short page means we've reached the end.
      hasMore = batch.length === pageSize;
    }

    if (!hasMore) return { data: all, error: null };
  }

  // Hit the safety bound while the service still reported more pages — surface it
  // rather than silently truncating the result.
  console.warn(`[fetchAllPages] stopped at maxPages=${maxPages} (${all.length} items) with more data available`);
  return { data: all, error: null };
};
