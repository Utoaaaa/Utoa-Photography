jest.mock('next/server', () => {
  class ResponseStub {
    status: number;
    body: unknown;
    constructor(body: unknown, init?: { status?: number }) {
      this.status = init?.status ?? 200;
      this.body = body;
    }
  }

  class NextResponse extends ResponseStub {
    static json(body: unknown, init?: { status?: number }) {
      return new NextResponse(body, init);
    }
  }

  class NextRequest {}

  if (typeof global.Response === 'undefined') {
    (global as any).Response = ResponseStub;
  }

  return { __esModule: true, NextResponse, NextRequest };
});

const prismaMock = {
  year: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  location: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('@/lib/db', () => ({
  __esModule: true,
  prisma: prismaMock,
  logAudit: jest.fn(),
}));

jest.mock('@/lib/cache', () => ({
  __esModule: true,
  invalidateCache: jest.fn().mockResolvedValue(undefined),
  CACHE_TAGS: {
    YEARS: 'years',
    year: (id: string) => `year:${id}`,
    yearCollections: (id: string) => `collections:year:${id}`,
  },
}));

const { NextResponse } = jest.requireMock('next/server');

function jsonRequest(body: unknown = {}, url = 'http://localhost/api/admin/years/2024/locations') {
  return {
    url,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  } as any;
}

function mockYear(options: { id?: string; label?: string } = {}) {
  return { id: options.id ?? 'year-1', label: options.label ?? '2024' };
}

const LOCATION_ID = '550e8400-e29b-41d4-a716-446655440101';

describe('admin locations API route', () => {
  let route: typeof import('../../src/app/api/admin/years/[yearId]/locations/route');
  let reorderRoute: typeof import('../../src/app/api/admin/locations/[locationId]/reorder/route');
  const logAudit = jest.requireMock('@/lib/db').logAudit as jest.Mock;
  const invalidateCache = jest.requireMock('@/lib/cache').invalidateCache as jest.Mock;

  beforeAll(async () => {
    route = await import('../../src/app/api/admin/years/[yearId]/locations/route');
    reorderRoute = await import('../../src/app/api/admin/locations/[locationId]/reorder/route');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(prismaMock.year).forEach((fn) => fn.mockReset());
    Object.values(prismaMock.location).forEach((fn) => fn.mockReset());
    prismaMock.year.findUnique.mockResolvedValue(null);
    prismaMock.year.findFirst.mockResolvedValue(mockYear());
    prismaMock.location.findFirst.mockResolvedValue(null);
    prismaMock.location.findMany.mockResolvedValue([]);
    prismaMock.location.update.mockResolvedValue(undefined);
  });

  describe('GET', () => {
    test('returns 404 when year not found', async () => {
      prismaMock.year.findUnique.mockResolvedValue(null);
      prismaMock.year.findFirst.mockResolvedValue(null);

      const res: typeof NextResponse = await route.GET(jsonRequest(), { params: Promise.resolve({ yearId: 'missing' }) });
      expect(res.status).toBe(404);
      expect(res.body).toEqual(expect.objectContaining({ error: 'not_found' }));
    });

    test('returns locations mapping with collection counts', async () => {
      prismaMock.year.findFirst.mockResolvedValue(mockYear());
      prismaMock.location.findMany.mockResolvedValue([
        {
          id: 'loc-1',
          year_id: 'year-1',
          name: 'Kyoto',
          slug: 'kyoto-24',
          summary: 'test',
          cover_asset_id: null,
          order_index: '1.0',
          created_at: new Date('2024-01-01T00:00:00Z'),
          updated_at: new Date('2024-01-02T00:00:00Z'),
          _count: { collections: 2 },
        },
      ]);

      const res: typeof NextResponse = await route.GET(jsonRequest(), { params: Promise.resolve({ yearId: 'year-1' }) });
      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        expect.objectContaining({
          id: 'loc-1',
          collectionCount: 2,
          createdAt: '2024-01-01T00:00:00.000Z',
        }),
      ]);
    });
  });

  describe('POST', () => {
    test('validates slug format', async () => {
      prismaMock.year.findFirst.mockResolvedValue(mockYear());
      const res: typeof NextResponse = await route.POST(
        jsonRequest({ name: 'Kyoto', slug: 'INVALID' }),
        { params: Promise.resolve({ yearId: 'year-1' }) },
      );
      expect(res.status).toBe(400);
      expect(res.body).toEqual(expect.objectContaining({ field: 'slug' }));
      expect(prismaMock.location.create).not.toHaveBeenCalled();
    });

    test('returns conflict when slug exists', async () => {
      prismaMock.year.findFirst.mockResolvedValue(mockYear());
      prismaMock.location.findFirst.mockResolvedValueOnce({ id: 'existing' });
      const res: typeof NextResponse = await route.POST(
        jsonRequest({ name: 'Kyoto', slug: 'kyoto-24' }),
        { params: Promise.resolve({ yearId: 'year-1' }) },
      );
      expect(res.status).toBe(409);
      expect(res.body).toEqual(expect.objectContaining({ error: 'conflict' }));
    });

    test('creates location and logs audit', async () => {
      prismaMock.year.findFirst.mockResolvedValue(mockYear());
      prismaMock.location.findFirst
        .mockResolvedValueOnce(null) // ensure slug available
        .mockResolvedValueOnce({ order_index: '3.0' });
      prismaMock.location.create.mockResolvedValue({
        id: 'loc-123',
        year_id: 'year-1',
        name: 'Kyoto',
        slug: 'kyoto-24',
        summary: null,
        cover_asset_id: null,
        order_index: '4.0',
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T00:00:00Z'),
        _count: { collections: 0 },
      });

      const res: typeof NextResponse = await route.POST(
        jsonRequest({ name: 'Kyoto', slug: 'kyoto-24' }),
        { params: Promise.resolve({ yearId: 'year-1' }) },
      );

      expect(res.status).toBe(201);
      expect(prismaMock.location.create).toHaveBeenCalled();
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'create', entity: 'location/loc-123' }));
      expect(invalidateCache).toHaveBeenCalled();
      expect(res.body).toEqual(expect.objectContaining({ id: 'loc-123', orderIndex: '4.0' }));
    });
  });

  describe('PUT', () => {
    test('requires valid location ID', async () => {
      prismaMock.year.findFirst.mockResolvedValue(mockYear());
      const res: typeof NextResponse = await route.PUT(
        jsonRequest({ slug: 'kyoto-24' }),
        { params: Promise.resolve({ yearId: 'year-1' }) },
      );
      expect(res.status).toBe(400);
      expect(res.body).toEqual(expect.objectContaining({ field: 'id' }));
    });

    test('handles slug conflict on update', async () => {
      prismaMock.year.findFirst.mockResolvedValue(mockYear());
      prismaMock.location.findFirst.mockResolvedValueOnce({ id: LOCATION_ID, year_id: 'year-1', slug: 'old-slug' });
      prismaMock.location.findFirst.mockResolvedValueOnce({ id: '550e8400-e29b-41d4-a716-446655440202' });
      const res: typeof NextResponse = await route.PUT(
        jsonRequest({ id: LOCATION_ID, slug: 'kyoto-24' }),
        { params: Promise.resolve({ yearId: 'year-1' }) },
      );
      expect(res.status).toBe(409);
      expect(res.body).toEqual(expect.objectContaining({ error: 'conflict' }));
    });
  });

  describe('DELETE', () => {
    test('blocks deletion when collections exist', async () => {
      prismaMock.year.findFirst.mockResolvedValue(mockYear());
      prismaMock.location.findFirst.mockResolvedValue({
        id: LOCATION_ID,
        year_id: 'year-1',
        slug: 'kyoto-24',
        summary: null,
        cover_asset_id: null,
        order_index: '1.0',
        created_at: new Date(),
        updated_at: new Date(),
        _count: { collections: 2 },
      });
      const res: typeof NextResponse = await route.DELETE(
        jsonRequest({ id: LOCATION_ID }),
        { params: Promise.resolve({ yearId: 'year-1' }) },
      );
      expect(res.status).toBe(409);
      expect(res.body).toEqual(expect.objectContaining({ error: 'conflict' }));
      expect(prismaMock.location.delete).not.toHaveBeenCalled();
    });

    test('deletes location and logs audit', async () => {
      prismaMock.year.findFirst.mockResolvedValue(mockYear());
      prismaMock.location.findFirst.mockResolvedValue({
        id: LOCATION_ID,
        year_id: 'year-1',
        slug: 'kyoto-24',
        summary: null,
        cover_asset_id: null,
        order_index: '1.0',
        created_at: new Date(),
        updated_at: new Date(),
        _count: { collections: 0 },
      });
      const res: typeof NextResponse = await route.DELETE(
        jsonRequest({ id: LOCATION_ID }),
        { params: Promise.resolve({ yearId: 'year-1' }) },
      );
      expect(res.status).toBe(204);
      expect(prismaMock.location.delete).toHaveBeenCalledWith({ where: { id: LOCATION_ID } });
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete', entity: `location/${LOCATION_ID}` }));
      expect(invalidateCache).toHaveBeenCalled();
    });
  });

  describe('POST /reorder', () => {
    const otherLocationId = '550e8400-e29b-41d4-a716-446655440202';

    test('validates orderedIds payload', async () => {
      prismaMock.year.findFirst.mockResolvedValue(mockYear());
      prismaMock.location.findFirst.mockResolvedValue({ id: LOCATION_ID, year_id: 'year-1' });
      const res: typeof NextResponse = await reorderRoute.POST(
        jsonRequest({ yearId: 'year-1', orderedIds: ['invalid-uuid'] }, `http://localhost/api/admin/locations/${LOCATION_ID}/reorder`),
        { params: Promise.resolve({ locationId: LOCATION_ID }) },
      );

      expect(res.status).toBe(400);
      expect(res.body).toEqual(expect.objectContaining({ field: 'orderedIds' }));
    });

    test('reorders locations and returns updated list', async () => {
      prismaMock.year.findFirst.mockResolvedValue(mockYear());
      prismaMock.location.findFirst.mockResolvedValueOnce({ id: LOCATION_ID, year_id: 'year-1' });

      const existing = [
        { id: LOCATION_ID, year_id: 'year-1', order_index: '1.0' },
        { id: otherLocationId, year_id: 'year-1', order_index: '2.0' },
      ];

      prismaMock.location.findMany
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce([
          {
            id: otherLocationId,
            year_id: 'year-1',
            name: 'Osaka',
            slug: 'osaka-24',
            summary: null,
            cover_asset_id: null,
            order_index: '1.0',
            created_at: new Date('2024-01-02T00:00:00Z'),
            updated_at: new Date('2024-01-02T00:00:00Z'),
            _count: { collections: 0 },
          },
          {
            id: LOCATION_ID,
            year_id: 'year-1',
            name: 'Kyoto',
            slug: 'kyoto-24',
            summary: null,
            cover_asset_id: null,
            order_index: '2.0',
            created_at: new Date('2024-01-01T00:00:00Z'),
            updated_at: new Date('2024-01-03T00:00:00Z'),
            _count: { collections: 1 },
          },
        ]);

      prismaMock.location.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, order_index: data.order_index }));

      const res: typeof NextResponse = await reorderRoute.POST(
        jsonRequest({ yearId: 'year-1', orderedIds: [otherLocationId, LOCATION_ID] }, `http://localhost/api/admin/locations/${LOCATION_ID}/reorder`),
        { params: Promise.resolve({ locationId: LOCATION_ID }) },
      );

      expect(res.status).toBe(200);
      expect(prismaMock.location.update).toHaveBeenCalledTimes(2);
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'sort', entity: 'year/year-1' }));
      expect(invalidateCache).toHaveBeenCalled();
      expect(res.body).toEqual([
        expect.objectContaining({ id: otherLocationId, orderIndex: '1.0' }),
        expect.objectContaining({ id: LOCATION_ID, orderIndex: '2.0' }),
      ]);
    });
  });
});
