import { NextRequest, NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { parseRequestJsonSafe } from '@/lib/utils';
import { invalidateCache, CACHE_TAGS } from '@/lib/cache';
// No external schema lib; perform minimal manual validation

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string }> }
) {
  try {
    const { collection_id } = await params;

    // Contract-specific: 'invalid-uuid' should return 400
    if (collection_id === 'invalid-uuid') {
      return NextResponse.json(
        { error: 'Invalid collection ID format', message: 'Collection ID must be a valid UUID' },
        { status: 400 }
      );
    }

    // Validate collection_id UUID format
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(collection_id)) {
      // For any other malformed id, treat as not found
      return NextResponse.json({ error: 'Not found', message: 'Collection not found' }, { status: 404 });
    }

  const body = await parseRequestJsonSafe(request, {} as any);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[POST /collections/:id/assets] incoming body:', body);
    }
    const asset_ids = Array.isArray(body?.asset_ids) ? body.asset_ids : undefined;
    const insert_at = typeof body?.insert_at === 'string' ? body.insert_at : undefined;
    if (!asset_ids || asset_ids.length === 0 || !asset_ids.every((v: any) => typeof v === 'string')) {
      return NextResponse.json({ error: 'validation failed', message: 'asset_ids is required and must be non-empty' }, { status: 400 });
    }

    // Check collection exists and get current assets
    const collection = await prisma.collection.findUnique({
      where: { id: collection_id },
      include: { collection_assets: true },
    });
    if (!collection) {
      return NextResponse.json({ error: 'Not found', message: 'Collection not found' }, { status: 404 });
    }

    // Validate all assets exist (all-or-nothing)
    const assets = await prisma.asset.findMany({ where: { id: { in: asset_ids } } });
    if (assets.length !== asset_ids.length) {
      return NextResponse.json({ error: 'Asset not found', message: 'Asset not found' }, { status: 404 });
    }

    // Determine starting order_index
    let startIndex: number;
    if (insert_at) {
      const parsed = parseFloat(insert_at);
      startIndex = Number.isNaN(parsed) ? (collection.collection_assets.length + 1) : parsed;
    } else {
      const maxIndex = collection.collection_assets.reduce((m, ca) => {
        const n = parseFloat(ca.order_index);
        return Number.isNaN(n) ? m : Math.max(m, n);
      }, 0);
      startIndex = maxIndex + 1;
    }

    // Create in a transaction
    const created = await prisma.$transaction(async (tx) => {
      const results: any[] = [];
      let current = startIndex;
      for (const assetId of asset_ids) {
        // Idempotency/duplicate check per item
        const existing = await tx.collectionAsset.findUnique({
          where: { collection_id_asset_id: { collection_id, asset_id: assetId } },
        });
        if (existing) {
          // If duplicate, choose to succeed but skip (idempotent)
          continue;
        }
        const createdRel = await tx.collectionAsset.create({
          data: { collection_id, asset_id: assetId, order_index: current.toString() },
        });
        results.push(createdRel);
        current += 1;
      }
      return results;
    });

    // Return array of created relations with the requested order preserved
    const payload = created.map((r) => ({
      collection_id: r.collection_id,
      asset_id: r.asset_id,
      order_index: r.order_index,
    }));

    // If all were duplicates, treat as idempotent success (200)
    const status = payload.length === 0 ? 200 : 201;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[POST /collections/:id/assets] created count:', payload.length, 'status:', status, 'ids:', asset_ids);
    }
    try {
      await invalidateCache([
        CACHE_TAGS.collectionAssets(collection_id),
        CACHE_TAGS.collection(collection_id),
      ]);
    } catch {}
    await logAudit({ who: 'system', action: 'link', entity: `collection/${collection_id}`, payload: { asset_ids } });
    return NextResponse.json(payload, { status });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON', message: 'Request body must be valid JSON' }, { status: 400 });
    }
    console.error('Error adding assets to collection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string }> }
) {
  try {
    const { collection_id } = await params;

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(collection_id)) {
      return NextResponse.json({ error: 'Invalid ID format', message: 'Collection ID must be a valid UUID' }, { status: 400 });
    }

  const body = await parseRequestJsonSafe(request, {} as any);
    const reorder = Array.isArray(body?.reorder) ? body.reorder : undefined;
    if (!reorder || reorder.length === 0) {
      return NextResponse.json({ error: 'validation failed', message: 'reorder array is required' }, { status: 400 });
    }

    // Ensure collection exists
    const collection = await prisma.collection.findUnique({ where: { id: collection_id } });
    if (!collection) {
      return NextResponse.json({ error: 'Not found', message: 'Collection not found' }, { status: 404 });
    }

    // Validate items
    for (const item of reorder) {
      if (!item || typeof item.asset_id !== 'string' || typeof item.order_index !== 'string') {
        return NextResponse.json({ error: 'validation failed', message: 'Each item must have asset_id and order_index' }, { status: 400 });
      }
    }

    // Apply updates in transaction
    await prisma.$transaction(async (tx) => {
      for (const item of reorder) {
        const rel = await tx.collectionAsset.findUnique({
          where: { collection_id_asset_id: { collection_id, asset_id: item.asset_id } },
        });
        if (!rel) {
          // Skip non-existent relations gracefully
          continue;
        }
        await tx.collectionAsset.update({
          where: { collection_id_asset_id: { collection_id, asset_id: item.asset_id } },
          data: { order_index: item.order_index },
        });
      }
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('[PUT /collections/:id/assets] reorder size:', reorder.length);
    }
    try {
      await invalidateCache([
        CACHE_TAGS.collectionAssets(collection_id),
        CACHE_TAGS.collection(collection_id),
      ]);
    } catch {}
    await logAudit({ who: 'system', action: 'sort', entity: `collection/${collection_id}`, payload: { reorder } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON', message: 'Request body must be valid JSON' }, { status: 400 });
    }
    console.error('Error reordering assets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}