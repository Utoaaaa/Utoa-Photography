jest.mock('next/cache', () => {
  let flakyState = { count: 0 };
  return {
    revalidateTag: (tag) => {
      if (tag.startsWith('fail-')) throw new Error('boom');
      if (tag.startsWith('flaky-')) {
        if (flakyState.count < 1) { flakyState.count++; throw new Error('flaky'); }
      }
      // success
    },
    revalidatePath: (p) => {
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
  test('revalidateTagsWithRetry retries and succeeds on flaky', async () => {
    const { revalidateTagsWithRetry } = await import('@/lib/cache');
    const res = await revalidateTagsWithRetry(['flaky-one'], { attempts: 3, baseDelayMs: 1 });
    expect(res.success).toContain('flaky-one');
    expect(res.failed).toHaveLength(0);
  });

  test('revalidateTagsWithRetry audits permanent failure', async () => {
    const { revalidateTagsWithRetry } = await import('@/lib/cache');
    const { logAudit } = await import('@/lib/db');
    const res = await revalidateTagsWithRetry(['fail-x'], { attempts: 2, baseDelayMs: 1 });
    expect(res.failed.map((f) => f.value)).toContain('fail-x');
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'revalidate', entity: 'tag/fail-x' }));
  });

  test('revalidatePathsWithRetry audits on failure', async () => {
    const { revalidatePathsWithRetry } = await import('@/lib/cache');
    const { logAudit } = await import('@/lib/db');
    const res = await revalidatePathsWithRetry(['/ok', '/fail-x'], { attempts: 2, baseDelayMs: 1 });
    expect(res.success).toContain('/ok');
    expect(res.failed.map((f) => f.value)).toContain('/fail-x');
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'revalidate', entity: 'path//fail-x' }));
  });
});
