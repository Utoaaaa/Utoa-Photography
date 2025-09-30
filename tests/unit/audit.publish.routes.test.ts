// Audit test for publish endpoint /api/publishing/collections/{id}/publish (T025)

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

describe('Publish route audit integration (T025)', () => {
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

  test('POST publish logs publish audit and transaction writes history', async () => {
    const collection_id = '44444444-4444-4444-4444-444444444444';
    // Mock existing collection with minimal fields used
  publishPrismaMock.collection.findUnique.mockResolvedValue({
      id: collection_id,
      title: 'Publishable',
      summary: 'S',
      seo_title: null,
      seo_description: null,
      seo_keywords: null,
      cover_asset_id: null,
      status: 'draft',
      order_index: '1.0',
      version: 2,
      published_at: null,
      collection_assets: [
        { asset_id: 'a1', order_index: '1', asset: { id: 'a1', alt: 'Alt', caption: null, description: null, title: null, photographer: null, location: null, tags: null, width: 100, height: 100 } },
      ],
      year: { id: 'y1', label: '2024', status: 'draft' },
      year_id: 'y1',
    });

    // Mock transaction behavior
  publishPrismaMock.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        collection: { update: jest.fn().mockResolvedValue({ id: collection_id, version: 3, last_published_at: new Date(), published_at: new Date() }) },
        publishHistory: { create: jest.fn().mockResolvedValue({ id: 'ph1' }) },
      };
      return cb(tx);
    });

    (pubDb.logAudit as jest.Mock).mockResolvedValue(undefined);
  const req = makePublishReq({ note: 'First prod publish' }, `http://localhost/api/publishing/collections/${collection_id}/publish`);
    const res: any = await publishRoute.POST(req, { params: Promise.resolve({ collection_id }) });
    expect(res.status).toBe(200);
    expect(pubDb.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'publish', entity: `collection/${collection_id}` }));
    const auditPayload = (pubDb.logAudit as jest.Mock).mock.calls[0][0];
    expect(auditPayload.payload.version).toBe(3);
  });
});
