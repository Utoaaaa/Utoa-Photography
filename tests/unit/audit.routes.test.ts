// We'll dynamically import after setting mocks
let db: any;
let assetsRoute: any;
let assetIdRoute: any;
let colAssetsRoute: any;
let colAssetIdRoute: any;

// next/server is mapped via moduleNameMapper to a lightweight stub

// Mock db module with a prisma mock and logAudit spyable function
jest.mock('../../src/lib/db', () => {
  const prismaMock = {
    asset: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    collection: {
      findUnique: jest.fn(),
    },
    collectionAsset: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  return {
    __esModule: true,
    prisma: prismaMock,
    logAudit: jest.fn(),
  };
});

// A handle to prismaMock for resets (will be db.prisma after import)
let prismaMock: any;

function makeJsonRequest(body: any, url = 'http://localhost/api/test') {
  return {
    url,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  } as any;
}

describe('Route audit integration (T025)', () => {
  beforeAll(async () => {
    // Ensure Node has fetch/Request polyfills before importing Next route modules
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const undici = require('undici');
      if (typeof globalThis.fetch === 'undefined') globalThis.fetch = undici.fetch;
      if (typeof globalThis.Request === 'undefined') globalThis.Request = undici.Request;
      if (typeof globalThis.Response === 'undefined') globalThis.Response = undici.Response;
      if (typeof globalThis.Headers === 'undefined') globalThis.Headers = undici.Headers;
    } catch {}
  // Import mocked db once mocks are in place
  db = await import('../../src/lib/db');
  prismaMock = db.prisma;
    // Then import routes
    assetsRoute = await import('../../src/app/api/assets/route');
    assetIdRoute = await import('../../src/app/api/assets/[asset_id]/route');
    colAssetsRoute = await import('../../src/app/api/collections/[collection_id]/assets/route');
    colAssetIdRoute = await import('../../src/app/api/collections/[collection_id]/assets/[asset_id]/route');
  });
  afterEach(() => {
    // reset mocks between tests
    (db.logAudit as jest.Mock).mockReset();
    Object.values(prismaMock.asset).forEach((fn: any) => typeof fn?.mockReset === 'function' && fn.mockReset());
    Object.values(prismaMock.collection).forEach((fn: any) => typeof fn?.mockReset === 'function' && fn.mockReset());
    Object.values(prismaMock.collectionAsset).forEach((fn: any) => typeof fn?.mockReset === 'function' && fn.mockReset());
    if (typeof prismaMock.$transaction?.mockReset === 'function') prismaMock.$transaction.mockReset();
  });

  test('POST /api/assets triggers create audit', async () => {
  (db.logAudit as jest.Mock).mockResolvedValue(undefined);
  prismaMock.asset.findUnique.mockResolvedValue(null);
  prismaMock.asset.create.mockResolvedValue({ id: 'a1', alt: 'x', width: 800, height: 600 } as any);

    const req = makeJsonRequest({ id: 'a1', alt: 'x', width: 800, height: 600 });
    const res: any = await assetsRoute.POST(req as any);
    expect(res.status).toBe(201);
    expect(db.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'create', entity: 'asset/a1' }));
  });

  test('DELETE /api/assets/{id} triggers delete audit', async () => {
  (db.logAudit as jest.Mock).mockResolvedValue(undefined);
  prismaMock.asset.findUnique.mockResolvedValue({ id: 'a1' } as any);
  prismaMock.collectionAsset.findMany.mockResolvedValue([]);
  prismaMock.asset.delete.mockResolvedValue({ id: 'a1' } as any);

    const req = makeJsonRequest({});
    const res: any = await assetIdRoute.DELETE(req as any, { params: Promise.resolve({ asset_id: 'a1' }) });
    expect(res.status).toBe(204);
    expect(db.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete', entity: 'asset/a1' }));
  });

  test('DELETE /api/assets/{id} returns 409 if referenced by collections', async () => {
    prismaMock.asset.findUnique.mockResolvedValue({ id: 'a2' } as any);
    prismaMock.collectionAsset.findMany.mockResolvedValue([{ collection_id: 'c1' }, { collection_id: 'c2' }]);
    const req = makeJsonRequest({});
    const res: any = await assetIdRoute.DELETE(req as any, { params: Promise.resolve({ asset_id: 'a2' }) });
    expect(res.status).toBe(409);
  const body = (res as any).body;
    expect(body.referenced_by).toEqual(['c1', 'c2']);
    expect(body.count).toBe(2);
  });

  test('POST /api/collections/{id}/assets triggers link audit', async () => {
    (db.logAudit as jest.Mock).mockResolvedValue(undefined);
    prismaMock.collection.findUnique.mockResolvedValue({ id: 'c1', collection_assets: [] } as any);
    prismaMock.asset.findMany.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }] as any);
    prismaMock.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        collectionAsset: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ collection_id: 'c1', asset_id: 'a1', order_index: '1' }),
        },
      };
      return cb(tx);
    });

    const req = makeJsonRequest({ asset_ids: ['a1', 'a2'] });
    const res: any = await colAssetsRoute.POST(req as any, { params: Promise.resolve({ collection_id: '11111111-1111-1111-1111-111111111111' }) });
    expect([200,201]).toContain(res.status);
    expect(db.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'link', entity: 'collection/11111111-1111-1111-1111-111111111111' }));
  });

  test('PUT /api/collections/{id}/assets triggers sort audit', async () => {
    (db.logAudit as jest.Mock).mockResolvedValue(undefined);
    prismaMock.collection.findUnique.mockResolvedValue({ id: 'c1' } as any);
    prismaMock.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        collectionAsset: {
          findUnique: jest.fn().mockResolvedValue({ collection_id: 'c1', asset_id: 'a1' }),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      return cb(tx);
    });

    const req = makeJsonRequest({ reorder: [{ asset_id: 'a1', order_index: '1' }] });
    const res: any = await colAssetsRoute.PUT(req as any, { params: Promise.resolve({ collection_id: '11111111-1111-1111-1111-111111111111' }) });
    expect(res.status).toBe(200);
    expect(db.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'sort', entity: 'collection/11111111-1111-1111-1111-111111111111' }));
  });

  test('DELETE /api/collections/{id}/assets/{assetId} triggers unlink audit', async () => {
  (db.logAudit as jest.Mock).mockResolvedValue(undefined);
  prismaMock.collection.findUnique.mockResolvedValue({ id: '11111111-1111-1111-1111-111111111111' } as any);
  prismaMock.collectionAsset.findUnique.mockResolvedValue({ collection_id: 'c1', asset_id: 'a1' } as any);
  prismaMock.collectionAsset.delete.mockResolvedValue({} as any);

    const req = makeJsonRequest({});
    const res: any = await colAssetIdRoute.DELETE(req as any, { params: Promise.resolve({ collection_id: '11111111-1111-1111-1111-111111111111', asset_id: 'a1' }) });
    expect(res.status).toBe(204);
    expect(db.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'unlink', entity: 'collection/11111111-1111-1111-1111-111111111111' }));
  });
});
