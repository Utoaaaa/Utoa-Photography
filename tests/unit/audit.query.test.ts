import { describe, expect, test, beforeEach, jest } from '@jest/globals';

jest.mock('../../src/lib/db', () => {
  const prisma = {
    publishHistory: {
      findMany: jest.fn(),
    },
  };
  return { __esModule: true, prisma };
});

describe('queryAudit helper (T043)', () => {
  let mod: typeof import('../../src/lib/queries/audit');
  let db: any;

  beforeEach(async () => {
    jest.resetModules();
    mod = await import('../../src/lib/queries/audit');
    db = await import('../../src/lib/db');
    db.prisma.publishHistory.findMany.mockReset();
  });

  test('returns empty for non-collection entity', async () => {
    const res = await mod.queryAudit({ entity: 'year' });
    expect(res).toEqual([]);
    expect(db.prisma.publishHistory.findMany).not.toHaveBeenCalled();
  });

  test('filters by collection id', async () => {
    db.prisma.publishHistory.findMany.mockResolvedValue([{ id: 'ph1', collection_id: 'c1' }]);
    const res = await mod.queryAudit({ entity: 'collection', entityId: 'c1' });
    expect(db.prisma.publishHistory.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ collection_id: 'c1' }),
    }));
    expect(res).toHaveLength(1);
  });

  test('applies from/to time window', async () => {
    db.prisma.publishHistory.findMany.mockResolvedValue([]);
    const from = new Date('2024-01-01T00:00:00.000Z');
    const to = '2025-12-31T23:59:59.000Z';
    await mod.queryAudit({ entity: 'collection', from, to });
    const args = db.prisma.publishHistory.findMany.mock.calls[0][0];
    expect(args.where.published_at.gte).toEqual(from);
    expect(args.where.published_at.lte).toEqual(new Date(to));
  });

  test('filters by action', async () => {
    db.prisma.publishHistory.findMany.mockResolvedValue([]);
    await mod.queryAudit({ entity: 'collection', action: 'publish' });
    expect(db.prisma.publishHistory.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ action: 'publish' }),
    }));
  });

  test('enforces pagination defaults and bounds', async () => {
    db.prisma.publishHistory.findMany.mockResolvedValue([]);
    await mod.queryAudit({ entity: 'collection' });
    expect(db.prisma.publishHistory.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 50, skip: 0 }));

    db.prisma.publishHistory.findMany.mockResolvedValue([]);
    await mod.queryAudit({ entity: 'collection', limit: 200, offset: -5 });
    expect(db.prisma.publishHistory.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 100, skip: 0 }));
  });
});
