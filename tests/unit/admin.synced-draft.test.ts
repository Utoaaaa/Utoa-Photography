import { act, renderHook } from '@testing-library/react';
import { useSyncedDraft } from '@/components/admin/workspace/useSyncedDraft';

test.each([
  'label',
  'name',
  'title',
  'slug',
  'summary',
  'status',
  'capturedAt',
  'locationId',
  'coverAssetId',
])(
  '%s follows refreshed source, preserves dirty values and resolves conflicts explicitly',
  (field) => {
    const { result, rerender } = renderHook(({ source }) => useSyncedDraft(source), {
      initialProps: { source: { [field]: 'original' } },
    });
    rerender({ source: { [field]: 'latest' } });
    expect(result.current.values[field]).toBe('latest');
    act(() => result.current.setField(field, 'my-edit'));
    rerender({ source: { [field]: 'remote-edit' } });
    expect(result.current.values[field]).toBe('my-edit');
    expect(result.current.hasConflict).toBe(true);
    act(() => result.current.keepEdits());
    expect(result.current.hasConflict).toBe(false);
    expect(result.current.values[field]).toBe('my-edit');
    rerender({ source: { [field]: 'my-edit' } });
    expect(result.current.hasConflict).toBe(false);
    rerender({ source: { [field]: 'next-update' } });
    expect(result.current.values[field]).toBe('next-update');
  }
);
