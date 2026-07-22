import { useState, useEffect } from 'react';

/** Subscribe to a media query. Re-renders when it starts/stops matching. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** The app's single mobile breakpoint: viewport ≤ 767px. */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}
