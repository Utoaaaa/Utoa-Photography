import { NextRequest, NextResponse } from 'next/server';

import type { AuditAction } from '@/lib/db';

import { requireAdminAuth } from '@/lib/auth';
import { parseRequestJsonSafe, writeAudit } from '@/lib/utils';
import { invalidateCache, CACHE_TAGS } from '@/lib/cache';
import { shouldUseD1Direct, d1CreateAuditLog } from '@/lib/d1-queries';
import { getD1Database } from '@/lib/cloudflare';

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
  action: AuditAction,
  collectionId: string,
  payload?: Record<string, unknown>,
) {
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
      console.error('[collections/assets] failed to persist audit via D1', error);
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
      console.error('[collections/assets] failed to write audit sink', error);
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

function createPlaceholders(count: number) {
  return Array.from({ length: count }, (_, index) => `?${index + 1}`).join(', ');
}

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string }> },
) {
  try {
    requireAdminAuth(request);
    const { collection_id } = await params;

    if (collection_id === 'invalid-uuid') {
      return NextResponse.json(
        { error: 'Invalid collection ID format', message: 'Collection ID must be a valid UUID' },
        { status: 400 },
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(collection_id)) {
      return NextResponse.json(
        { error: 'Not found', message: 'Collection not found' },
        { status: 404 },
      );
    }

    const body = await parseRequestJsonSafe<Record<string, unknown>>(request, {});
    const assetIds = Array.isArray(body?.asset_ids) ? body.asset_ids : undefined;
    const insertAt = typeof body?.insert_at === 'string' ? body.insert_at : undefined;

    if (!assetIds || assetIds.length === 0 || !assetIds.every((v) => typeof v === 'string')) {
      return NextResponse.json(
        { error: 'validation failed', message: 'asset_ids is required and must be non-empty' },
        { status: 400 },
      );
    }

    const useD1 = shouldUseD1Direct();

    if (useD1) {
      const db = requireD1();

      const collectionRow = await db.prepare(
        'SELECT year_id FROM collections WHERE id = ?1 LIMIT 1',
      ).bind(collection_id).first() as { year_id: string } | null;

      if (!collectionRow) {
        return NextResponse.json(
          { error: 'Not found', message: 'Collection not found' },
          { status: 404 },
        );
      }

      const placeholders = createPlaceholders(assetIds.length);
      const assetsResult = await db.prepare(
        `SELECT id FROM assets WHERE id IN (${placeholders})`,
      ).bind(...assetIds).all();

      const foundAssets = new Set(
        (assetsResult.results ?? []).map((row: Record<string, unknown>) => String(row.id)),
      );

      if (foundAssets.size !== assetIds.length) {
        return NextResponse.json(
          { error: 'Asset not found', message: 'Asset not found' },
          { status: 404 },
        );
      }

      const existingResult = await db.prepare(
        'SELECT asset_id, order_index FROM collection_assets WHERE collection_id = ?1',
      ).bind(collection_id).all();

      const existingRows = (existingResult.results ?? []) as Array<Record<string, unknown>>;
      const existingAssets = new Set(existingRows.map((row) => String(row.asset_id)));

      let startIndex: number;
      if (insertAt) {
        const parsed = Number.parseFloat(insertAt);
        startIndex = Number.isNaN(parsed) ? existingRows.length + 1 : parsed;
      } else {
        const maxIndex = existingRows.reduce((max, row) => {
          const value = Number.parseFloat(String(row.order_index));
          return Number.isNaN(value) ? max : Math.max(max, value);
        }, 0);
        startIndex = maxIndex + 1;
      }

      const now = new Date().toISOString();
      const statements = [];
      const createdPayload: Array<{ collection_id: string; asset_id: string; order_index: string }> = [];
      let currentIndex = startIndex;

      for (const assetId of assetIds) {
        if (existingAssets.has(assetId)) {
          continue;
        }
        const orderIndex = currentIndex.toString();
        statements.push(
          db.prepare(
            'INSERT INTO collection_assets (collection_id, asset_id, order_index, created_at) VALUES (?1, ?2, ?3, ?4)',
          ).bind(collection_id, assetId, orderIndex, now),
        );
        createdPayload.push({ collection_id, asset_id: assetId, order_index: orderIndex });
        currentIndex += 1;
      }

      if (statements.length > 0) {
        await db.batch(statements);
      }

      const status = createdPayload.length === 0 ? 200 : 201;

      await invalidateCache([
        CACHE_TAGS.collectionAssets(collection_id),
        CACHE_TAGS.collection(collection_id),
        CACHE_TAGS.yearCollections(collectionRow.year_id),
      ]);

      await recordAudit(true, 'link', collection_id, { asset_ids: assetIds });

      return NextResponse.json(createdPayload, { status });
    }

    const { prisma, logAudit } = await getNodeDb();

    const collection = await prisma.collection.findUnique({
      where: { id: collection_id },
      include: { collection_assets: true },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Not found', message: 'Collection not found' },
        { status: 404 },
      );
    }

    const assets = await prisma.asset.findMany({
      where: { id: { in: assetIds } },
      select: { id: true },
    });

    if (assets.length !== assetIds.length) {
      return NextResponse.json(
        { error: 'Asset not found', message: 'Asset not found' },
        { status: 404 },
      );
    }

    let startIndex: number;
    if (insertAt) {
      const parsed = Number.parseFloat(insertAt);
      startIndex = Number.isNaN(parsed) ? (collection.collection_assets.length + 1) : parsed;
    } else {
      const maxIndex = collection.collection_assets.reduce((max, item) => {
        const value = Number.parseFloat(item.order_index);
        return Number.isNaN(value) ? max : Math.max(max, value);
      }, 0);
      startIndex = maxIndex + 1;
    }

    const created = await prisma.$transaction((tx) => {
      const operations: Array<Promise<unknown>> = [];
      const results: Array<{ collection_id: string; asset_id: string; order_index: string }> = [];
      let current = startIndex;

      for (const assetId of assetIds) {
        operations.push(
          (async () => {
            const existing = await tx.collectionAsset.findUnique({
              where: { collection_id_asset_id: { collection_id, asset_id: assetId } },
            });
            if (existing) {
              return;
            }
            const orderIndex = current.toString();
            const createdRelation = await tx.collectionAsset.create({
              data: {
                collection_id,
                asset_id: assetId,
                order_index: orderIndex,
              },
            });
            results.push({
              collection_id: createdRelation.collection_id,
              asset_id: createdRelation.asset_id,
              order_index: createdRelation.order_index,
            });
            current += 1;
          })(),
        );
      }

      return Promise.all(operations).then(() => results);
    });

    const status = created.length === 0 ? 200 : 201;

    await invalidateCache([
      CACHE_TAGS.collectionAssets(collection_id),
      CACHE_TAGS.collection(collection_id),
      CACHE_TAGS.yearCollections(collection.year_id),
    ]);

    await logAudit({
      who: 'system',
      action: 'link',
      entity: `collection/${collection_id}`,
      payload: { asset_ids: assetIds },
    });

    return NextResponse.json(created, { status });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 },
      );
    }
    console.error('Error adding assets to collection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string }> },
) {
  try {
    requireAdminAuth(request);
    const { collection_id } = await params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(collection_id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Collection ID must be a valid UUID' },
        { status: 400 },
      );
    }

    const body = await parseRequestJsonSafe<Record<string, unknown>>(request, {});
    const reorder = Array.isArray(body?.reorder) ? body.reorder : undefined;

    if (!reorder || reorder.length === 0) {
      return NextResponse.json(
        { error: 'validation failed', message: 'reorder array is required' },
        { status: 400 },
      );
    }

    if (!reorder.every((item) => item && typeof item.asset_id === 'string' && typeof item.order_index === 'string')) {
      return NextResponse.json(
        { error: 'validation failed', message: 'Each item must have asset_id and order_index' },
        { status: 400 },
      );
    }

    const useD1 = shouldUseD1Direct();

    if (useD1) {
      const db = requireD1();
      const collectionRow = await db.prepare(
        'SELECT year_id FROM collections WHERE id = ?1 LIMIT 1',
      ).bind(collection_id).first() as { year_id: string } | null;

      if (!collectionRow) {
        return NextResponse.json(
          { error: 'Not found', message: 'Collection not found' },
          { status: 404 },
        );
      }

      const statements = reorder.map((item) =>
        db.prepare(
          'UPDATE collection_assets SET order_index = ?1 WHERE collection_id = ?2 AND asset_id = ?3',
        ).bind(item.order_index, collection_id, item.asset_id),
      );

      if (statements.length > 0) {
        await db.batch(statements);
      }

      await invalidateCache([
        CACHE_TAGS.collectionAssets(collection_id),
        CACHE_TAGS.collection(collection_id),
        CACHE_TAGS.yearCollections(collectionRow.year_id),
      ]);

      await recordAudit(true, 'sort', collection_id, { reorder });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    const { prisma, logAudit } = await getNodeDb();

    const exists = await prisma.collection.findUnique({
      where: { id: collection_id },
      select: { year_id: true },
    });

    if (!exists) {
      return NextResponse.json(
        { error: 'Not found', message: 'Collection not found' },
        { status: 404 },
      );
    }

    await prisma.$transaction((tx) =>
      Promise.all(
        reorder.map(async (item) => {
          const relation = await tx.collectionAsset.findUnique({
            where: { collection_id_asset_id: { collection_id, asset_id: item.asset_id } },
          });
          if (!relation) {
            return;
          }
          await tx.collectionAsset.update({
            where: { collection_id_asset_id: { collection_id, asset_id: item.asset_id } },
            data: { order_index: item.order_index },
          });
        }),
      ),
    );

    await invalidateCache([
      CACHE_TAGS.collectionAssets(collection_id),
      CACHE_TAGS.collection(collection_id),
      CACHE_TAGS.yearCollections(exists.year_id),
    ]);

    await logAudit({
      who: 'system',
      action: 'sort',
      entity: `collection/${collection_id}`,
      payload: { reorder },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 },
      );
    }
    console.error('Error reordering assets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
