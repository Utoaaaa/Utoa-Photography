import { act, renderHook, waitFor } from '@testing-library/react';
import { usePhotoCandidates } from '@/components/admin/workspace/usePhotoCandidates';
import { loadCandidatePage } from '@/components/admin/workspace/api';
import type { DemoAsset } from '@/components/admin/workspace/types';
jest.mock('@/components/admin/workspace/api', () => ({ loadCandidatePage: jest.fn() }));
const load = loadCandidatePage as jest.Mock;
afterEach(() => jest.resetAllMocks());

test('closed candidates do not request data and a pending page cannot be requested twice', async () => {
  let finish!: (value: { assets: DemoAsset[]; total: number }) => void;
  load.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  const { result, rerender } = renderHook(({ open }) => usePhotoCandidates(open, true, 'l1'), {
    initialProps: { open: false },
  });
  expect(load).not.toHaveBeenCalled();
  rerender({ open: true });
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  await act(async () => {
    await result.current.loadMore();
  });
  expect(load).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish({ assets: [], total: 0 });
  });
  expect(result.current.loaded).toBe(true);
});

test('late results from the previous location do not replace current candidates', async () => {
  let finishOld!: (value: { assets: DemoAsset[]; total: number }) => void;
  load.mockImplementation((id: string) =>
    id === 'old'
      ? new Promise((resolve) => {
          finishOld = resolve;
        })
      : Promise.resolve({ assets: [{ id: 'new-photo' }], total: 1 })
  );
  const { result, rerender } = renderHook(
    ({ location }) => usePhotoCandidates(true, true, location),
    { initialProps: { location: 'old' } }
  );
  await waitFor(() => expect(load).toHaveBeenCalledWith('old', 0));
  rerender({ location: 'new' });
  await waitFor(() =>
    expect(result.current.assets.map((asset) => asset.id)).toEqual(['new-photo'])
  );
  await act(async () => {
    finishOld({ assets: [{ id: 'old-photo' } as DemoAsset], total: 1 });
  });
  expect(result.current.assets.map((asset) => asset.id)).toEqual(['new-photo']);
});
