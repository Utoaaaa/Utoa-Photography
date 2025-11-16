'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface LoaderStateContextValue {
  loaderActive: boolean;
  setLoaderActive: (active: boolean) => void;
}

const LoaderStateContext = createContext<LoaderStateContextValue>({
  loaderActive: false,
  setLoaderActive: () => {
    // noop for SSR/default usage
  },
});

interface LoaderStateProviderProps {
  children: ReactNode;
}

export function LoaderStateProvider({ children }: LoaderStateProviderProps) {
  const [loaderActive, setLoaderActiveState] = useState(true);

  const setLoaderActive = useCallback((active: boolean) => {
    setLoaderActiveState(active);
  }, []);

  const value = useMemo(
    () => ({
      loaderActive,
      setLoaderActive,
    }),
    [loaderActive, setLoaderActive],
  );

  return <LoaderStateContext.Provider value={value}>{children}</LoaderStateContext.Provider>;
}

export function useLoaderState() {
  return useContext(LoaderStateContext);
}
