// Unit tests for /api/assets/batch-delete
let route;
let db;

jest.mock('../../src/lib/db', () => {
  const prismaMock = {
    asset: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    collectionAsset: {
      findMany: jest.fn(),
    },
  };
  return { __esModule: true, prisma: prismaMock, logAudit: jest.fn() };
});

function makeJsonRequest(body) {
  return {
    headers: { get: () => 'Bearer test' },
    json: async () => body,
  };
}

describe('POST /api/assets/batch-delete', () => {
  beforeAll(async () => {
    db = await import('../../src/lib/db');
    route = await import('../../src/app/api/assets/batch-delete/route');
  });
  afterEach(() => {
    Object.values(db.prisma.asset).forEach((fn) => fn.mockReset && fn.mockReset());
    Object.values(db.prisma.collectionAsset).forEach((fn) => fn.mockReset && fn.mockReset());
    db.logAudit.mockReset();
  });

  it('rejects when more than 20 ids are provided', async () => {
    const ids = Array.from({ length: 21 }, (_, i) => `a${i}`);
    const res = await route.POST(makeJsonRequest({ asset_ids: ids }));
    expect(res.status).toBe(400);
    expect(res.body?.error).toBe('limit exceeded');
  });

  it('returns summary with partial failures (referenced)', async () => {
    db.prisma.asset.findUnique.mockResolvedValue({ id: 'a1' });
    db.prisma.collectionAsset.findMany.mockResolvedValueOnce([{ collection_id: 'c1' }]);
    const res = await route.POST(makeJsonRequest({ asset_ids: ['a1'] }));
    expect(res.status).toBe(200);
    expect(res.body.deletedIds).toEqual([]);
    expect(res.body.failed).toEqual([
      { id: 'a1', reason: 'referenced', details: { referenced_by: ['c1'], count: 1 } },
    ]);
  });

  it('deletes when not referenced and logs audit', async () => {
    db.prisma.asset.findUnique.mockResolvedValue({ id: 'a2' });
    db.prisma.collectionAsset.findMany.mockResolvedValueOnce([]);
    db.prisma.asset.delete.mockResolvedValue({});
    const res = await route.POST(makeJsonRequest({ asset_ids: ['a2'] }));
    expect(res.status).toBe(200);
    expect(res.body.deletedIds).toEqual(['a2']);
    expect(db.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete', entity: 'asset/a2' }));
  });
});
