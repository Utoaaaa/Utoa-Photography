'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface SmoothScrollContextValue {
  lenis: unknown | null;
  prefersReducedMotion: boolean;
  setLenis: (instance: unknown | null) => void;
}

const defaultContext: SmoothScrollContextValue = {
  lenis: null,
  prefersReducedMotion: false,
  setLenis: () => {
    // noop — default implementation for non-browser environments / tests
  },
};

const SmoothScrollContext = createContext<SmoothScrollContextValue>(defaultContext);

export interface SmoothScrollProviderProps {
  children: ReactNode;
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const [lenis, setLenis] = useState<unknown | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Treat mobile/tablet as reduced for scroll smoothing purposes
    const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
    const tabletWidthQuery = window.matchMedia('(max-width: 1024px)');

    const applyPreference = () => {
      const reduce = mediaQuery.matches;
      const isCoarse = coarsePointerQuery.matches;
      const isTabletOrSmaller = tabletWidthQuery.matches;
      // If any condition suggests avoiding smooth effects, opt out
      setPrefersReducedMotion(reduce || isCoarse || isTabletOrSmaller);
    };

    applyPreference();

    const handler = () => applyPreference();

    const add = (q: MediaQueryList) => {
      if (typeof q.addEventListener === 'function') q.addEventListener('change', handler);
      else if (typeof q.addListener === 'function') q.addListener(handler);
    };
    const remove = (q: MediaQueryList) => {
      if (typeof q.removeEventListener === 'function') q.removeEventListener('change', handler);
      else if (typeof q.removeListener === 'function') q.removeListener(handler);
    };

    add(mediaQuery); add(coarsePointerQuery); add(tabletWidthQuery);
    return () => { remove(mediaQuery); remove(coarsePointerQuery); remove(tabletWidthQuery); };
  }, []);

  const safeSetLenis = useCallback((instance: unknown | null) => {
    setLenis(instance);
  }, []);

  const value = useMemo<SmoothScrollContextValue>(
    () => ({
      lenis,
      prefersReducedMotion,
      setLenis: safeSetLenis,
    }),
    [lenis, prefersReducedMotion, safeSetLenis],
  );

  return <SmoothScrollContext.Provider value={value}>{children}</SmoothScrollContext.Provider>;
}

export function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}

export function useLenisInstance<T = unknown>() {
  const { lenis } = useSmoothScroll();
  return lenis as T | null;
}
