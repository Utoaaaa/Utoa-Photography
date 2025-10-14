// Publish guard tests ensuring location assignment required before publishing (T021)

let pubDb: any;
let publishRoute: any;
let publishPrismaMock: any;

jest.mock('next/server', () => {
  class NextResponse {
    status: number; body: any;
    constructor(body: any, init?: { status?: number }) { this.status = init?.status ?? 200; this.body = body; }
    static json(body: any, init?: { status?: number }) { return { status: init?.status ?? 200, body }; }
  }
  return { __esModule: true, NextResponse, NextRequest: class {} };
});

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

jest.mock('../../src/lib/db', () => {
  const mock = {
    collection: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  return { __esModule: true, prisma: mock, logAudit: jest.fn() };
});

function makePublishReq(body: any, url: string) {
  return { url, headers: { get: () => 'Bearer test' }, text: async () => JSON.stringify(body) } as any;
}

describe('Publish guard enforces location assignment (T021)', () => {
  const collection_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const baseCollection = {
    id: collection_id,
    title: 'Guarded Collection',
    summary: 'S',
    seo_title: null,
    seo_description: null,
    seo_keywords: null,
    cover_asset_id: null,
    status: 'draft',
    order_index: '1.0',
    version: 1,
    published_at: null,
    collection_assets: [
      { asset_id: 'asset-1', order_index: '1', asset: { id: 'asset-1', alt: 'Alt text', caption: null, description: null, title: null, photographer: null, location: null, tags: null, width: 100, height: 100 } }
    ],
    year: { id: 'year-1', label: '2024', status: 'draft' },
    year_id: 'year-1',
    location: null,
    location_id: null,
  };

  beforeAll(async () => {
    pubDb = await import('../../src/lib/db');
    publishPrismaMock = pubDb.prisma;
    publishRoute = await import('../../src/app/api/publishing/collections/[collection_id]/publish/route');
  });

  afterEach(() => {
    (pubDb.logAudit as jest.Mock).mockReset();
    Object.values(publishPrismaMock.collection).forEach((fn: any) => fn.mockReset && fn.mockReset());
    if (typeof publishPrismaMock.$transaction?.mockReset === 'function') publishPrismaMock.$transaction.mockReset();
  });

  test('returns 409 when collection is missing location assignment', async () => {
    publishPrismaMock.collection.findUnique.mockResolvedValue({ ...baseCollection });

    const req = makePublishReq({}, `http://localhost/api/publishing/collections/${collection_id}/publish`);
    const res: any = await publishRoute.POST(req, { params: Promise.resolve({ collection_id }) });

    expect(res.status).toBe(409);
    expect(res.body).toEqual(expect.objectContaining({ error: 'MissingLocation' }));
    expect(publishPrismaMock.$transaction).not.toHaveBeenCalled();
  });

  test('returns 409 even when force flag is true', async () => {
    publishPrismaMock.collection.findUnique.mockResolvedValue({ ...baseCollection });

    const req = makePublishReq({ force: true }, `http://localhost/api/publishing/collections/${collection_id}/publish`);
    const res: any = await publishRoute.POST(req, { params: Promise.resolve({ collection_id }) });

    expect(res.status).toBe(409);
    expect(res.body).toEqual(expect.objectContaining({ error: 'MissingLocation' }));
    expect(publishPrismaMock.$transaction).not.toHaveBeenCalled();
  });
});

export {};
