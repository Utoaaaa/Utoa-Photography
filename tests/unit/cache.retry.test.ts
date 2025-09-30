import { revalidatePathsWithRetry, revalidateTagsWithRetry } from '@/lib/cache';

jest.mock('next/cache', () => {
  let failFirstTwo = true;
  return {
    revalidateTag: (tag: string) => {
      if (tag.startsWith('fail-')) throw new Error('boom');
      if (tag.startsWith('flaky-')) {
        if (failFirstTwo) { failFirstTwo = false; throw new Error('flaky'); }
      }
      // ok
    },
    revalidatePath: (p: string) => {
      if (p.startsWith('/fail-')) throw new Error('boom');
    }
  };
});

jest.mock('@/lib/db', () => {
  const original = jest.requireActual('@/lib/db');
  return {
    ...original,
    logAudit: jest.fn().mockResolvedValue(undefined),
  };
});

describe('cache retry helpers', () => {
  test('revalidateTagsWithRetry retries flaky and succeeds', async () => {
    const res = await revalidateTagsWithRetry(['flaky-1']);
    expect(res.success).toContain('flaky-1');
    expect(res.failed).toHaveLength(0);
  });

  test('revalidateTagsWithRetry audits permanent failure', async () => {
    const { logAudit } = await import('@/lib/db');
    const res = await revalidateTagsWithRetry(['fail-x'], { attempts: 2, baseDelayMs: 1 });
    expect(res.failed.map(f => f.value)).toContain('fail-x');
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'revalidate', entity: 'tag/fail-x' }));
  });

  test('revalidatePathsWithRetry handles success and failure', async () => {
    const { logAudit } = await import('@/lib/db');
    const res = await revalidatePathsWithRetry(['/ok', '/fail-x'], { attempts: 2, baseDelayMs: 1 });
    expect(res.success).toContain('/ok');
    expect(res.failed.map(f => f.value)).toContain('/fail-x');
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'revalidate', entity: 'path//fail-x' }));
  });
});
