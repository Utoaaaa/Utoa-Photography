import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VariantBackfill } from '@/components/admin/VariantBackfill';

describe('image size backfill controls', () => {
  const fetchMock = jest.fn();
  beforeEach(() => { localStorage.clear(); fetchMock.mockReset(); global.fetch = fetchMock; });

  it('reports partial failure and retries only failed photos', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true, errors: [] }) })
      .mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({ ok: false, errors: ['desktop:failed'] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true, errors: [] }) });
    render(<VariantBackfill selectedIds={['a', 'b']} onUpdated={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '補齊所選（2）' }));
    await screen.findByText(/部分失敗：成功 1 \/ 失敗 1/);
    fireEvent.click(screen.getByRole('button', { name: '重試失敗項目（1）' }));
    await screen.findByText(/補齊完成：成功 2 \/ 失敗 0/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toContain('/b?scope=new');
  });

  it('restores pending work and does not auto-run on page load', async () => {
    localStorage.setItem('utoa:image-backfill:960-1920:v1', JSON.stringify({ pending: ['b'], completed: 1, total: 2, failed: [] }));
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, errors: [] }) });
    render(<VariantBackfill selectedIds={[]} onUpdated={jest.fn()} />);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '繼續上次進度' }));
    await screen.findByText(/補齊完成：成功 2/);
    expect(fetchMock.mock.calls[0][0]).toContain('/b?scope=new');
  });

  it('scans the whole library, not just loaded or selected rows', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 'a' }], total: 2 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 'b' }], total: 2 }) })
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, errors: [] }) });
    render(<VariantBackfill selectedIds={[]} onUpdated={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '補齊全部素材' }));
    await waitFor(() => expect(screen.getByText(/補齊完成：成功 2/)).toBeInTheDocument());
    expect(fetchMock.mock.calls[1][0]).toContain('offset=1');
    expect(fetchMock.mock.calls[3][0]).toContain('/b?scope=new');
  });
});

// The test runtime exposes MessageChannel; release React scheduler ports.
afterAll(() => {
  const getHandles = (process as typeof process & { _getActiveHandles?: () => { constructor?: { name?: string }; close?: () => void }[] })._getActiveHandles;
  if (getHandles) for (const handle of getHandles()) {
    if (handle.constructor?.name === 'MessagePort' && handle.close) handle.close();
  }
});
