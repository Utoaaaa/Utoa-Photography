jest.mock('next/server', () => {
  class ResponseStub {
    status: number;
    body: unknown;
    headers: Map<string, string>;
    constructor(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this.status = init?.status ?? 200;
      this.body = body;
      this.headers = new Map(Object.entries(init?.headers ?? { 'content-type': 'application/json' }));
    }

    async json() {
      return this.body;
    }
  }

  class NextResponse extends ResponseStub {
    static json(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return new NextResponse(body, init);
    }
  }

  class NextRequest {}

  if (typeof global.Response === 'undefined') {
    (global as any).Response = ResponseStub;
  }

  return { __esModule: true, NextResponse, NextRequest };
});

const prismaAssignMock = {
  collection: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  location: {
    findUnique: jest.fn(),
  },
} as {
  collection: { findUnique: jest.Mock; update: jest.Mock };
  location: { findUnique: jest.Mock };
};

jest.mock('@/lib/db', () => ({
  __esModule: true,
  prisma: prismaAssignMock,
  logAudit: jest.fn(),
}));

jest.mock('@/lib/cache', () => ({
  __esModule: true,
  invalidateCache: jest.fn().mockResolvedValue(undefined),
  CACHE_TAGS: {
    COLLECTIONS: 'collections',
    collection: (id: string) => `collection:${id}`,
    yearCollections: (id: string) => `collections:year:${id}`,
    year: (id: string) => `year:${id}`,
  },
}));

const NextResponseMock = jest.requireMock('next/server').NextResponse;
const logAudit = jest.requireMock('@/lib/db').logAudit as jest.Mock;
const invalidateCache = jest.requireMock('@/lib/cache').invalidateCache as jest.Mock;

function createJsonRequest(body: unknown = {}, url = 'http://localhost/api/admin/collections/col-1/location') {
  return {
    url,
    headers: { get: (key: string) => (key.toLowerCase() === 'content-type' ? 'application/json' : null) },
    text: async () => JSON.stringify(body),
  } as any;
}

describe('POST /api/admin/collections/[collectionId]/location', () => {
  let route: typeof import('../../src/app/api/admin/collections/[collectionId]/location/route');
  const collectionId = '550e8400-e29b-41d4-a716-446655440100';
  const locationId = '550e8400-e29b-41d4-a716-446655440200';

  beforeAll(async () => {
    route = await import('../../src/app/api/admin/collections/[collectionId]/location/route');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(prismaAssignMock.collection).forEach((fn) => (fn as jest.Mock).mockReset());
    Object.values(prismaAssignMock.location).forEach((fn) => (fn as jest.Mock).mockReset());
    prismaAssignMock.collection.findUnique.mockResolvedValue({
      id: collectionId,
      year_id: 'year-1',
      location_id: null,
    });
    prismaAssignMock.collection.update.mockResolvedValue({
      id: collectionId,
      year_id: 'year-1',
      title: 'Sunrise',
      slug: 'sunrise',
      status: 'draft',
      location_id: locationId,
      order_index: '1.0',
      updated_at: new Date('2024-01-01T00:00:00Z'),
    });
    prismaAssignMock.location.findUnique.mockResolvedValue({
      id: locationId,
      year_id: 'year-1',
    });
  });

  test('returns 400 when collectionId is invalid', async () => {
  const res: typeof NextResponseMock = await route.POST(createJsonRequest(), { params: Promise.resolve({ collectionId: 'invalid' }) });
    expect(res.status).toBe(400);
    expect(res.body).toEqual(expect.objectContaining({ field: 'collectionId' }));
  });

  test('returns 400 when locationId missing', async () => {
    const res: typeof NextResponseMock = await route.POST(createJsonRequest({}), { params: Promise.resolve({ collectionId }) });
    expect(res.status).toBe(400);
    expect(res.body).toEqual(expect.objectContaining({ field: 'locationId' }));
  });

  test('returns 400 when locationId format invalid', async () => {
    const res: typeof NextResponseMock = await route.POST(createJsonRequest({ locationId: 'not-uuid' }), { params: Promise.resolve({ collectionId }) });
    expect(res.status).toBe(400);
    expect(res.body).toEqual(expect.objectContaining({ field: 'locationId' }));
  });

  test('returns 404 when collection not found', async () => {
    prismaAssignMock.collection.findUnique.mockResolvedValueOnce(null);
    const res: typeof NextResponseMock = await route.POST(createJsonRequest({ locationId }), { params: Promise.resolve({ collectionId }) });
    expect(res.status).toBe(404);
    expect(res.body).toEqual(expect.objectContaining({ error: 'not_found' }));
  });

  test('returns 404 when location missing', async () => {
    prismaAssignMock.location.findUnique.mockResolvedValueOnce(null);
    const res: typeof NextResponseMock = await route.POST(createJsonRequest({ locationId }), { params: Promise.resolve({ collectionId }) });
    expect(res.status).toBe(404);
    expect(res.body).toEqual(expect.objectContaining({ error: 'not_found' }));
  });

  test('returns 400 when location belongs to different year', async () => {
    prismaAssignMock.location.findUnique.mockResolvedValueOnce({ id: locationId, year_id: 'year-2' });
    const res: typeof NextResponseMock = await route.POST(createJsonRequest({ locationId }), { params: Promise.resolve({ collectionId }) });
    expect(res.status).toBe(400);
    expect(res.body).toEqual(expect.objectContaining({ field: 'locationId' }));
  });

  test('assigns location successfully', async () => {
    const res: typeof NextResponseMock = await route.POST(createJsonRequest({ locationId }), { params: Promise.resolve({ collectionId }) });
    expect(res.status).toBe(200);
  expect(prismaAssignMock.collection.update).toHaveBeenCalledWith({
      where: { id: collectionId },
      data: { location_id: locationId },
      select: expect.any(Object),
    });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'link', entity: `collection/${collectionId}` }));
    expect(invalidateCache).toHaveBeenCalledWith(expect.arrayContaining([
      'collections',
      `collection:${collectionId}`,
      'collections:year:year-1',
      'year:year-1',
    ]));
    expect(res.body).toEqual(expect.objectContaining({ locationId }));
  });

  test('allows unassigning location', async () => {
    prismaAssignMock.collection.findUnique.mockResolvedValueOnce({ id: collectionId, year_id: 'year-1', location_id: locationId });
    prismaAssignMock.collection.update.mockResolvedValueOnce({
      id: collectionId,
      year_id: 'year-1',
      title: 'Sunrise',
      slug: 'sunrise',
      status: 'draft',
      location_id: null,
      order_index: '1.0',
      updated_at: new Date('2024-01-01T00:00:00Z'),
    });

    const res: typeof NextResponseMock = await route.POST(createJsonRequest({ locationId: null }), { params: Promise.resolve({ collectionId }) });
    expect(res.status).toBe(200);
  expect(prismaAssignMock.collection.update).toHaveBeenCalledWith({
      where: { id: collectionId },
      data: { location_id: null },
      select: expect.any(Object),
    });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'unlink' }));
    expect(res.body).toEqual(expect.objectContaining({ locationId: null }));
  });
});
