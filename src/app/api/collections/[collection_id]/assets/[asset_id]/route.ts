import { NextRequest, NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/auth';
import { invalidateCache, CACHE_TAGS } from '@/lib/cache';
import { shouldUseD1Direct, d1CreateAuditLog } from '@/lib/d1-queries';
import { getD1Database } from '@/lib/cloudflare';
import { writeAudit } from '@/lib/utils';

type PrismaClient = import('@prisma/client').PrismaClient;
type LogAuditFn = typeof import('@/lib/db').logAudit;

let nodeDbPromise: Promise<{ prisma: PrismaClient; logAudit: LogAuditFn }> | null = null;

async function getNodeDb() {
  if (!nodeDbPromise) {
    nodeDbPromise = import('@/lib/db').then(({ prisma, logAudit }) => ({ prisma, logAudit }));
  }
  return nodeDbPromise;
}

function requireD1() {
  const db = getD1Database();
  if (!db) {
    throw new Error('D1 database not available');
  }
  return db;
}

async function recordAudit(
  useD1: boolean,
  params: { action: 'link' | 'unlink'; collectionId: string; payload?: Record<string, unknown> },
) {
  const { action, collectionId, payload } = params;
  if (useD1) {
    try {
      await d1CreateAuditLog({
        actor: 'system',
        actor_type: 'system',
        entity_type: 'collection',
        entity_id: collectionId,
        action,
        meta: JSON.stringify({ payload }),
      });
    } catch (error) {
      console.error('[collection-asset] failed to persist audit log via D1', error);
    }

    try {
      await writeAudit({
        timestamp: new Date().toISOString(),
        who: 'system',
        action,
        entity: `collection/${collectionId}`,
        payload,
      });
    } catch (error) {
      console.error('[collection-asset] failed to write audit sink', error);
    }
    return;
  }

  const { logAudit } = await getNodeDb();
  await logAudit({
    who: 'system',
    action,
    entity: `collection/${collectionId}`,
    payload,
  });
}

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string; asset_id: string }> },
) {
  try {
    requireAdminAuth(request);
    const { collection_id, asset_id } = await params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(collection_id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Collection ID must be a valid UUID' },
        { status: 400 },
      );
    }

    const useD1 = shouldUseD1Direct();

    if (useD1) {
      const db = requireD1();

      const collection = await db.prepare(
        'SELECT year_id FROM collections WHERE id = ?1 LIMIT 1',
      ).bind(collection_id).first() as { year_id: string } | null;

      if (!collection) {
        return NextResponse.json(
          { error: 'Not found', message: 'Collection not found' },
          { status: 404 },
        );
      }

      const existing = await db.prepare(
        'SELECT order_index FROM collection_assets WHERE collection_id = ?1 AND asset_id = ?2 LIMIT 1',
      ).bind(collection_id, asset_id).first();

      if (!existing) {
        return NextResponse.json(
          { error: 'Not found', message: 'Asset not linked to this collection' },
          { status: 404 },
        );
      }

      await db.prepare(
        'DELETE FROM collection_assets WHERE collection_id = ?1 AND asset_id = ?2',
      ).bind(collection_id, asset_id).run();

      try {
        await invalidateCache([
          CACHE_TAGS.collectionAssets(collection_id),
          CACHE_TAGS.collection(collection_id),
          CACHE_TAGS.yearCollections(collection.year_id),
        ]);
      } catch (error) {
        console.error('[collection-asset] cache invalidation failed (D1 path)', error);
      }

      await recordAudit(true, { action: 'unlink', collectionId: collection_id, payload: { asset_id } });

      return new NextResponse(null, { status: 204 });
    }

    const { prisma } = await getNodeDb();

    const collection = await prisma.collection.findUnique({ where: { id: collection_id } });
    if (!collection) {
      return NextResponse.json(
        { error: 'Not found', message: 'Collection not found' },
        { status: 404 },
      );
    }

    const existing = await prisma.collectionAsset.findUnique({
      where: { collection_id_asset_id: { collection_id, asset_id } },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Not found', message: 'Asset not linked to this collection' },
        { status: 404 },
      );
    }

    await prisma.collectionAsset.delete({
      where: { collection_id_asset_id: { collection_id, asset_id } },
    });

    try {
      await invalidateCache([
        CACHE_TAGS.collectionAssets(collection_id),
        CACHE_TAGS.collection(collection_id),
        CACHE_TAGS.yearCollections(collection.year_id),
      ]);
    } catch (error) {
      console.error('[collection-asset] cache invalidation failed (Prisma path)', error);
    }

    await recordAudit(false, { action: 'unlink', collectionId: collection_id, payload: { asset_id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error unlinking asset from collection:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to unlink asset' },
      { status: 500 },
    );
  }
}
