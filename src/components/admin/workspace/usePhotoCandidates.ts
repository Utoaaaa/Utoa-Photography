'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DemoAsset } from './types';
import { loadCandidatePage } from './api';

export function usePhotoCandidates(open: boolean, enabled: boolean, locationId: string) {
  const [state, setState] = useState({
    assets: [] as DemoAsset[],
    total: 0,
    offset: 0,
    loaded: false,
    loading: false,
    error: '',
  });
  const stateRef = useRef(state);
  stateRef.current = state;
  const version = useRef(0);
  const inFlight = useRef(false);
  const loadMore = useCallback(async () => {
    if (inFlight.current) return;
    const token = version.current;
    inFlight.current = true;
    const offset = stateRef.current.loaded ? stateRef.current.offset : 0;
    setState((previous) => ({ ...previous, loading: true, error: '' }));
    try {
      const page = await loadCandidatePage(locationId, offset);
      if (token !== version.current) return;
      setState((previous) => ({
        assets: [
          ...new Map(
            [...previous.assets, ...page.assets].map((asset) => [asset.id, asset])
          ).values(),
        ],
        offset: offset + page.assets.length,
        total: page.assets.length ? page.total : offset,
        loaded: true,
        loading: false,
        error: '',
      }));
    } catch (error) {
      if (token === version.current)
        setState((previous) => ({
          ...previous,
          loading: false,
          error: error instanceof Error ? error.message : '照片載入失敗。',
        }));
    } finally {
      if (token === version.current) inFlight.current = false;
    }
  }, [locationId]);
  useEffect(() => {
    const generation = version.current + 1;
    version.current = generation;
    inFlight.current = false;
    setState({ assets: [], total: 0, offset: 0, loaded: false, loading: false, error: '' });
    return () => {
      version.current = generation + 1;
    };
  }, [locationId]);
  useEffect(() => {
    if (open && enabled && !state.loaded && !state.loading && !state.error) void loadMore();
  }, [open, enabled, state.loaded, state.loading, state.error, loadMore]);
  return { ...state, loadMore, hasMore: state.loaded && state.offset < state.total };
}
