// Audit tests for /api/years and /api/years/[id]
// Mirrors style of audit.routes.test.ts with local mocks

let yearsDbMod: any;
let yearsRoot: any;
let yearIdRoute: any;

jest.mock('next/server', () => {
  class NextResponse {
    status: number;
    body: any;
    constructor(body: any, init?: { status?: number }) {
      this.status = init?.status ?? 200;
      this.body = body;
    }
    static json(body: any, init?: { status?: number }) {
      return { status: init?.status ?? 200, body } as any;
    }
  }
  return { __esModule: true, NextResponse, NextRequest: class {} };
});

jest.mock('../../src/lib/db', () => {
  const prismaMock = {
    year: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    collection: {
      count: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    collectionAsset: {
      deleteMany: jest.fn(),
    },
  };
  return {
    __esModule: true,
    prisma: prismaMock,
    logAudit: jest.fn(),
  };
});

jest.mock('../../src/lib/cache', () => ({
  __esModule: true,
  invalidateCache: jest.fn().mockResolvedValue(undefined),
  CACHE_TAGS: {
    YEARS: 'YEARS',
    year: (id: string) => `year:${id}`,
  },
}));
jest.mock('@/lib/cache', () => ({
  __esModule: true,
  invalidateCache: jest.fn().mockResolvedValue(undefined),
  CACHE_TAGS: {
    YEARS: 'YEARS',
    year: (id: string) => `year:${id}`,
  },
}));

let yearsPrismaMock: any;

function makeYearJsonRequest(body: any, url = 'http://localhost/api/years') {
  return {
    url,
    headers: { get: () => 'Bearer test' },
    text: async () => JSON.stringify(body),
  } as any;
}

// Minimal mock for global fetch-related classes expected by route code (if any)
if (typeof (global as any).Request === 'undefined') {
  (global as any).Request = class {};
}
if (typeof (global as any).Response === 'undefined') {
  (global as any).Response = class {};
}
if (typeof (global as any).Headers === 'undefined') {
  (global as any).Headers = class {};
}

// --- PATCH START --- ensure searchParams parsing works: route constructs new URL(request.url)
// Provide a URL class usage-compatible object; our request already supplies url string so OK.
// --- PATCH END ---

describe('Year routes audit integration (T025)', () => {
  beforeAll(async () => {
    yearsDbMod = await import('../../src/lib/db');
    yearsPrismaMock = yearsDbMod.prisma;
    yearsRoot = await import('../../src/app/api/years/route');
    yearIdRoute = await import('../../src/app/api/years/[year_id]/route');
  });

  afterEach(() => {
    (yearsDbMod.logAudit as jest.Mock).mockReset();
    Object.values(yearsPrismaMock.year).forEach((fn: any) => fn.mockReset && fn.mockReset());
    Object.values(yearsPrismaMock.collection).forEach((fn: any) => fn.mockReset && fn.mockReset());
    Object.values(yearsPrismaMock.collectionAsset).forEach((fn: any) => fn.mockReset && fn.mockReset());
  });

  test('POST /api/years logs create audit', async () => {
    (yearsDbMod.logAudit as jest.Mock).mockResolvedValue(undefined);
    yearsPrismaMock.year.create.mockResolvedValue({ id: 'y1', label: '2025', order_index: '2025.0', status: 'draft' });
    const req = makeYearJsonRequest({ label: '2025' });
    const res: any = await yearsRoot.POST(req);
    expect(res.status).toBe(201);
    expect(yearsDbMod.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'create', entity: 'year/y1' }));
  });

  test('PUT /api/years/{id} logs edit audit', async () => {
    (yearsDbMod.logAudit as jest.Mock).mockResolvedValue(undefined);
    yearsPrismaMock.year.findUnique.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440000' });
    yearsPrismaMock.year.update.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440000', label: '2024', order_index: '2024.0' });
    const req = makeYearJsonRequest({ label: '2024' }, 'http://localhost/api/years/550e8400-e29b-41d4-a716-446655440000');
    const res: any = await yearIdRoute.PUT(req, { params: Promise.resolve({ year_id: '550e8400-e29b-41d4-a716-446655440000' }) });
    expect(res.status).toBe(200);
    expect(yearsDbMod.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'edit', entity: 'year/550e8400-e29b-41d4-a716-446655440000' }));
  });

  test('DELETE /api/years/{id} logs delete audit (no collections)', async () => {
    (yearsDbMod.logAudit as jest.Mock).mockResolvedValue(undefined);
    yearsPrismaMock.collection.count.mockResolvedValue(0);
    yearsPrismaMock.year.delete.mockResolvedValue({ id: '11111111-2222-3333-4444-555555555555' });
    const req = makeYearJsonRequest({}, 'http://localhost/api/years/11111111-2222-3333-4444-555555555555');
    try {
      const res: any = await yearIdRoute.DELETE(req, { params: Promise.resolve({ year_id: '11111111-2222-3333-4444-555555555555' }) });
      if (res.status !== 204) {
        console.error('DELETE year (no collections) unexpected response', res);
      }
      expect(res.status).toBe(204);
      expect(yearsDbMod.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete', entity: 'year/11111111-2222-3333-4444-555555555555' }));
    } catch (e) {
      console.error('DELETE test threw', e);
      throw e;
    }
  });

  test('DELETE /api/years/{id}?force=true cascades and logs delete', async () => {
    (yearsDbMod.logAudit as jest.Mock).mockResolvedValue(undefined);
    yearsPrismaMock.collection.count.mockResolvedValue(2);
    yearsPrismaMock.collection.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
    yearsPrismaMock.collectionAsset.deleteMany.mockResolvedValue({});
    yearsPrismaMock.collection.deleteMany.mockResolvedValue({});
    yearsPrismaMock.year.delete.mockResolvedValue({ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' });
    const req = makeYearJsonRequest({}, 'http://localhost/api/years/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee?force=true');
    try {
      const res: any = await yearIdRoute.DELETE(req, { params: Promise.resolve({ year_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }) });
      if (res.status !== 204) {
        console.error('DELETE year (force) unexpected response', res);
      }
      expect(res.status).toBe(204);
      expect(yearsDbMod.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete', entity: 'year/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }));
    } catch (e) {
      console.error('DELETE force test threw', e);
      throw e;
    }
  });
});
