// Audit tests for collections routes (T025): create via year nested POST, update via /collections/{id} PUT, delete via /collections/{id} DELETE

let dbMod: any;
let yearCollectionsRoute: any;
let collectionIdRoute: any;
let collectionsPrismaMock: any;

jest.mock('next/server', () => {
  class NextResponse {
    status: number; body: any;
    constructor(body: any, init?: { status?: number }) { this.status = init?.status ?? 200; this.body = body; }
    static json(body: any, init?: { status?: number }) { return { status: init?.status ?? 200, body }; }
  }
  return { __esModule: true, NextResponse, NextRequest: class {} };
});

jest.mock('../../src/lib/db', () => {
  const mock = {
    year: { findUnique: jest.fn() },
    collection: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  return { __esModule: true, prisma: mock, logAudit: jest.fn() };
});

jest.mock('../../src/lib/cache', () => ({
  __esModule: true,
  invalidateCache: jest.fn().mockResolvedValue(undefined),
  CACHE_TAGS: {
    COLLECTIONS: 'COLLECTIONS',
    yearCollections: (y: string) => `yc:${y}`,
    year: (y: string) => `year:${y}`,
    collection: (c: string) => `col:${c}`,
  },
}));
jest.mock('@/lib/cache', () => ({
  __esModule: true,
  invalidateCache: jest.fn().mockResolvedValue(undefined),
  CACHE_TAGS: {
    COLLECTIONS: 'COLLECTIONS',
    yearCollections: (y: string) => `yc:${y}`,
    year: (y: string) => `year:${y}`,
    collection: (c: string) => `col:${c}`,
  },
}));

function makeReq(body: any, url: string) {
  return { url, headers: { get: () => 'Bearer test' }, text: async () => JSON.stringify(body) } as any;
}

describe('Collection routes audit integration (T025)', () => {
  beforeAll(async () => {
    dbMod = await import('../../src/lib/db');
  collectionsPrismaMock = dbMod.prisma;
    yearCollectionsRoute = await import('../../src/app/api/years/[year_id]/collections/route');
    collectionIdRoute = await import('../../src/app/api/collections/[collection_id]/route');
  });

  afterEach(() => {
    (dbMod.logAudit as jest.Mock).mockReset();
  Object.values(collectionsPrismaMock.year).forEach((fn: any) => fn.mockReset && fn.mockReset());
  Object.values(collectionsPrismaMock.collection).forEach((fn: any) => fn.mockReset && fn.mockReset());
  });

  test('POST /api/years/{year_id}/collections logs create audit', async () => {
  collectionsPrismaMock.year.findUnique.mockResolvedValue({ id: 'y1' });
  collectionsPrismaMock.collection.create.mockResolvedValue({ id: 'c1', slug: 'set-a', year_id: 'y1' });
    (dbMod.logAudit as jest.Mock).mockResolvedValue(undefined);
    const req = makeReq({ slug: 'set-a', title: 'Set A', summary: 'S' }, 'http://localhost/api/years/y1/collections');
    const res: any = await yearCollectionsRoute.POST(req, { params: Promise.resolve({ year_id: 'y1' }) });
    expect(res.status).toBe(201);
    expect(dbMod.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'create', entity: 'collection/c1' }));
  });

  test('PUT /api/collections/{id} logs edit audit', async () => {
  collectionsPrismaMock.collection.update.mockResolvedValue({ id: '22222222-2222-2222-2222-222222222222', year_id: 'y1', title: 'Updated', slug: 'old' });
    (dbMod.logAudit as jest.Mock).mockResolvedValue(undefined);
  const req = makeReq({ title: 'Updated' }, 'http://localhost/api/collections/22222222-2222-2222-2222-222222222222');
  const res: any = await collectionIdRoute.PUT(req, { params: Promise.resolve({ collection_id: '22222222-2222-2222-2222-222222222222' }) });
    expect(res.status).toBe(200);
  expect(dbMod.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'edit', entity: 'collection/22222222-2222-2222-2222-222222222222' }));
  });

  test('DELETE /api/collections/{id} logs delete audit', async () => {
  collectionsPrismaMock.collection.delete.mockResolvedValue({ id: '33333333-3333-3333-3333-333333333333' });
    (dbMod.logAudit as jest.Mock).mockResolvedValue(undefined);
  const req = makeReq({}, 'http://localhost/api/collections/33333333-3333-3333-3333-333333333333');
  const res: any = await collectionIdRoute.DELETE(req, { params: Promise.resolve({ collection_id: '33333333-3333-3333-3333-333333333333' }) });
    expect(res.status).toBe(204);
  expect(dbMod.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete', entity: 'collection/33333333-3333-3333-3333-333333333333' }));
  });
});
