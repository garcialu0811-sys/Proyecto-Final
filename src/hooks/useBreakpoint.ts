'use client';

import { useState, useEffect } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg');

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 480) setBreakpoint('xs');
      else if (w < 640) setBreakpoint('sm');
      else if (w < 768) setBreakpoint('md');
      else if (w < 1024) setBreakpoint('lg');
      else if (w < 1280) setBreakpoint('xl');
      else setBreakpoint('2xl');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}

export function useIsMobile() {
  const bp = useBreakpoint();
  return bp === 'xs' || bp === 'sm';
}

export function useIsTablet() {
  const bp = useBreakpoint();
  return bp === 'md' || bp === 'lg';
}

export function useIsDesktop() {
  const bp = useBreakpoint();
  return bp === 'xl' || bp === '2xl';
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}
