// Page through an advanced-search service method until there are no more pages,
// accumulating every row. Used where the full set is needed (e.g. curriculum tree
// views) rather than a single page. `fn` receives a pagination object `{ page, size }`
// and returns the service's `{ data, pagination }` envelope.
export const fetchAllPages = async (fn, { size = 100, maxPages = 50 } = {}) => {
  let page = 0;
  let all = [];
  let more = true;
  while (more) {
    const { data, pagination } = (await fn({ page, size })) || {};
    all = all.concat(Array.isArray(data) ? data : []);
    more = !!pagination?.hasMore;
    page += 1;
    if (page > maxPages) break; // safety stop (≤ maxPages * size rows)
  }
  return all;
};
