'use client';

import { useState } from 'react';

/** Refresh untouched fields, preserve local edits, and require a choice on conflicting edits. */
export function useSyncedDraft<T extends Record<string, string | null>>(source: T) {
  const [state, setState] = useState({
    base: source,
    values: source,
    conflicts: [] as (keyof T)[],
  });
  let current = state;
  const keys = Object.keys(source) as (keyof T)[];
  if (keys.some((key) => source[key] !== state.base[key])) {
    const values = { ...state.values };
    const conflicts = new Set(state.conflicts);
    for (const key of keys) {
      if (source[key] === state.base[key]) continue;
      if (values[key] === state.base[key] || values[key] === source[key]) {
        values[key] = source[key];
        conflicts.delete(key);
      } else {
        conflicts.add(key);
      }
    }
    current = { base: source, values, conflicts: [...conflicts] };
    setState(current);
  }
  return {
    values: current.values,
    hasConflict: current.conflicts.length > 0,
    setField<K extends keyof T>(key: K, value: T[K]) {
      setState((previous) => ({
        ...previous,
        values: { ...previous.values, [key]: value },
        conflicts:
          value === previous.base[key]
            ? previous.conflicts.filter((field) => field !== key)
            : previous.conflicts,
      }));
    },
    useLatest() {
      setState({ base: source, values: source, conflicts: [] });
    },
    keepEdits() {
      setState((previous) => ({ ...previous, conflicts: [] }));
    },
  };
}
