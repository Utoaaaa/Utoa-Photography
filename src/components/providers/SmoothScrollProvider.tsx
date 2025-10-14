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

    const applyPreference = (query: MediaQueryList | MediaQueryListEvent) => {
      if ('matches' in query) {
        setPrefersReducedMotion(query.matches);
      } else {
        setPrefersReducedMotion(mediaQuery.matches);
      }
    };

    applyPreference(mediaQuery);

    const handler = (event: MediaQueryListEvent) => applyPreference(event);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }

    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handler);
      return () => {
        if (typeof mediaQuery.removeListener === 'function') {
          mediaQuery.removeListener(handler);
        }
      };
    }

    return undefined;
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
