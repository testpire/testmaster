import React, { useEffect, useRef, useState } from 'react';

// A zero-height marker placed at the end of a paginated list. It uses an
// IntersectionObserver rooted at the viewport (root: null) to detect when it
// scrolls into view, and fires `onLoadMore` while it stays visible and there are
// more pages to load.
//
// Why viewport-rooted (not a scroll container): several pages render their list
// inside a `flex-1 overflow-y-auto` div whose height collapses to `auto` (the
// PageLayout content area isn't a bounded-height flex column), so the *window*
// scrolls, not that div — an `onScroll` handler on it never fires. Observing the
// viewport works whether the window or an inner container does the scrolling, so
// this sidesteps the layout-height problem with no magic heights.
//
// Loads are driven from an effect on (visible, hasMore, loading) rather than
// straight from the observer callback: IntersectionObserver only fires on
// visibility *transitions*, so if the sentinel is still on-screen after a page
// appends (short rows), the effect re-checks once `loading` clears and keeps
// paging until the sentinel is pushed off-screen or `hasMore` becomes false.
const InfiniteScrollSentinel = ({
  onLoadMore,
  hasMore,
  loading = false,
  rootMargin = '300px',
  className = '',
}) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  // Keep the latest callback in a ref so the load effect doesn't re-fire just
  // because the parent passed a new function identity.
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!hasMore) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      (entries) => setVisible(!!entries[0]?.isIntersecting),
      { root: null, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, rootMargin]);

  useEffect(() => {
    if (visible && hasMore && !loading) {
      onLoadMoreRef.current?.();
    }
  }, [visible, hasMore, loading]);

  // Render nothing observable once there's nothing left to load.
  if (!hasMore) return null;
  return <div ref={ref} aria-hidden="true" className={className} />;
};

export default InfiniteScrollSentinel;
