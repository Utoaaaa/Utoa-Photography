import { setAuditSink } from '../../src/lib/utils';
import { prisma, logAudit } from '../../src/lib/db';

describe('Audit logging', () => {
  afterEach(() => {
    // Reset sink to console default
    setAuditSink(() => {});
    jest.restoreAllMocks();
  });

  test('non-publish actions go to sink', async () => {
    const records: any[] = [];
  setAuditSink((r) => { records.push(r as any); });

    await logAudit({ who: 'tester', action: 'create', entity: 'asset/1', payload: { id: '1' } });
    await logAudit({ who: 'tester', action: 'edit', entity: 'year/2', payload: { label: '2024' } });
    await logAudit({ who: 'tester', action: 'delete', entity: 'collection/3' });
    await logAudit({ who: 'tester', action: 'link', entity: 'collection/3', payload: { asset_id: 'a' } });
    await logAudit({ who: 'tester', action: 'unlink', entity: 'collection/3', payload: { asset_id: 'b' } });
    await logAudit({ who: 'tester', action: 'sort', entity: 'collection/3', payload: { reorder: [] } });

    expect(records.length).toBe(6);
    expect(records[0]).toMatchObject({ who: 'tester', action: 'create', entity: 'asset/1' });
    expect(records[5]).toMatchObject({ action: 'sort', entity: 'collection/3' });
  });

  test('publish writes to publish_history with snapshot', async () => {
    const collectionId = '11111111-1111-1111-1111-111111111111';
    const findSpy = jest.spyOn(prisma.collection, 'findUnique').mockResolvedValue({ id: collectionId, year_id: 'y', slug: 's', title: 't', summary: null, cover_asset_id: null, template_id: null, status: 'draft', order_index: '1', published_at: null, last_published_at: null, version: 2, publish_note: null, seo_title: null, seo_description: null, seo_keywords: null, created_at: new Date(), updated_at: new Date() } as any);
  const ph1 = (prisma as any).publishHistory;
  const createSpy = jest.spyOn(ph1, 'create').mockResolvedValue({ id: 'ph1', collection_id: collectionId, version: 2, action: 'publish' as any, note: '', user_id: 'tester', published_at: new Date(), snapshot_data: '{}' } as any);

    await logAudit({ who: 'tester', action: 'publish', entity: `collection/${collectionId}`, payload: { note: 'go' }, metadata: { origin: 'test' } });

    expect(findSpy).toHaveBeenCalled();
    expect(createSpy).toHaveBeenCalled();
    const args = (createSpy.mock.calls[0]?.[0] as any)?.data;
    expect(args.collection_id).toBe(collectionId);
    expect(args.version).toBe(2);
    expect(args.user_id).toBe('tester');
    expect(typeof args.snapshot_data).toBe('string');
    const snap = JSON.parse(args.snapshot_data);
    expect(snap.action).toBe('publish');
    expect(snap.payload).toMatchObject({ note: 'go' });
    expect(snap.metadata).toMatchObject({ origin: 'test' });
  });

  test('unpublish writes to publish_history', async () => {
    const collectionId = '22222222-2222-2222-2222-222222222222';
    jest.spyOn(prisma.collection, 'findUnique').mockResolvedValue({ id: collectionId, version: 5 } as any);
  const ph2 = (prisma as any).publishHistory;
  const createSpy = jest.spyOn(ph2, 'create').mockResolvedValue({ id: 'ph2', collection_id: collectionId, version: 5, action: 'unpublish' as any, note: '', user_id: 'tester', published_at: new Date(), snapshot_data: '{}' } as any);

    await logAudit({ who: 'tester', action: 'unpublish', entity: `collection/${collectionId}` });

    expect(createSpy).toHaveBeenCalled();
    const args = (createSpy.mock.calls[0]?.[0] as any)?.data;
    expect(args.collection_id).toBe(collectionId);
    expect(args.version).toBe(5);
  });

  test('sink receives metadata & payload fidelity (optional coverage)', async () => {
    const captured: any[] = [];
    setAuditSink(async (e) => { captured.push(e); });
    await logAudit({ who: 'metaUser', action: 'edit', entity: 'collection/xyz', payload: { field: 'title', value: 'New' }, metadata: { reason: 'bulk-fix' } });
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({ who: 'metaUser', action: 'edit', entity: 'collection/xyz' });
    expect(captured[0].payload).toMatchObject({ field: 'title', value: 'New' });
    expect(captured[0].metadata).toMatchObject({ reason: 'bulk-fix' });
  });
});
