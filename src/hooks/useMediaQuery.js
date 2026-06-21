import { useState, useEffect } from 'react';

// Reactive CSS media-query hook. Returns true while `query` matches and updates
// on viewport changes (resize / orientation). Used to branch between the mobile
// and desktop layouts (e.g. the Study Materials drill-down vs. two-pane view)
// without loading heavy embeds on phones.
//
// `lg` in this project's Tailwind config is 1024px, so the common call is
// `useMediaQuery('(min-width: 1024px)')` to mirror the `lg:` breakpoint.
const useMediaQuery = (query) => {
  const getMatch = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false;

  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    // addEventListener is the modern API; older Safari only has addListener.
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return matches;
};

export default useMediaQuery;
