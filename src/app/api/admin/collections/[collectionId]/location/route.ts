import { NextRequest, NextResponse } from 'next/server';

import type { AuditAction } from '@/lib/db';
import { parseRequestJsonSafe, writeAudit } from '@/lib/utils';
import { CACHE_TAGS, invalidateCache } from '@/lib/cache';
import { shouldUseD1Direct, d1CreateAuditLog } from '@/lib/d1-queries';
import { d1FindLocationById } from '@/lib/d1/location-service';
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

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AssignmentPayload = {
  locationId?: unknown;
};

type RouteContext = {
  params: Promise<{ collectionId?: string | string[] }>;
};

type RouteContextLike = {
  params: { collectionId?: string | string[] } | Promise<{ collectionId?: string | string[] }>;
};

type CollectionRecord = {
  id: string;
  year_id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  location_id: string | null;
  order_index: string | null;
  updated_at: Date | null;
};

type CollectionDto = {
  id: string;
  yearId: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  locationId: string | null;
  orderIndex: string | null;
  updatedAt: string | null;
};

type PostResult = NextResponse<CollectionDto | { error: string; message: string; field?: string }> | Response;

const ADMIN_ACTOR = 'system';

function validationError(message: string, field?: string) {
  return NextResponse.json(
    field ? { error: 'validation_error', message, field } : { error: 'validation_error', message },
    { status: 400 },
  );
}

function notFound(message: string) {
  return NextResponse.json({ error: 'not_found', message }, { status: 404 });
}

async function recordAudit(
  useD1: boolean,
  params: { action: AuditAction; collectionId: string; payload?: Record<string, unknown> },
) {
  const { action, collectionId, payload } = params;
  if (useD1) {
    try {
      await d1CreateAuditLog({
        actor: ADMIN_ACTOR,
        actor_type: 'system',
        entity_type: 'collection',
        entity_id: collectionId,
        action,
        meta: JSON.stringify({ payload }),
      });
    } catch (error) {
      console.error('[assign-collection-location] failed to persist audit via D1', error);
    }

    try {
      await writeAudit({
        timestamp: new Date().toISOString(),
        who: ADMIN_ACTOR,
        action,
        entity: `collection/${collectionId}`,
        payload,
      });
    } catch (error) {
      console.error('[assign-collection-location] failed to write audit sink', error);
    }
    return;
  }

  const { logAudit } = await getNodeDb();
  await logAudit({
    who: ADMIN_ACTOR,
    action,
    entity: `collection/${collectionId}`,
    payload,
  });
}

function mapCollection(record: CollectionRecord): CollectionDto {
  return {
    id: record.id,
    yearId: record.year_id,
    title: record.title,
    slug: record.slug,
    status: record.status,
    locationId: record.location_id,
    orderIndex: record.order_index,
    updatedAt: record.updated_at instanceof Date ? record.updated_at.toISOString() : record.updated_at,
  };
}

function normalizeLocationId(payload: AssignmentPayload): string | null | undefined {
  if (!Object.prototype.hasOwnProperty.call(payload, 'locationId')) return undefined;
  const value = payload.locationId;
  if (value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return undefined;
}

async function invalidateCaches(yearId: string, collectionId: string) {
  try {
    await invalidateCache([
      CACHE_TAGS.COLLECTIONS,
      CACHE_TAGS.collection(collectionId),
      CACHE_TAGS.yearCollections(yearId),
      CACHE_TAGS.year(yearId),
    ]);
  } catch (error) {
    console.error('[assign-collection-location] cache invalidation failed:', error);
  }
}

async function postImpl(request: NextRequest, context: RouteContextLike): Promise<PostResult> {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const raw = resolvedParams?.collectionId;
    const collectionParam = Array.isArray(raw) ? raw[0] : raw;
    const collectionId = typeof collectionParam === 'string' && collectionParam ? collectionParam : '';
    const decodedCollectionId = collectionId ? decodeURIComponent(collectionId) : '';
    if (!uuidRegex.test(decodedCollectionId)) {
      return validationError('Collection ID 格式不正確。', 'collectionId');
    }

    const body = await parseRequestJsonSafe<AssignmentPayload>(request, {});
    const normalizedLocation = normalizeLocationId(body);

    if (normalizedLocation === undefined) {
      return validationError('請提供 locationId 欄位。', 'locationId');
    }

    if (typeof normalizedLocation === 'string' && normalizedLocation && !uuidRegex.test(normalizedLocation)) {
      return validationError('地點 ID 格式不正確。', 'locationId');
    }

    const targetLocationId = normalizedLocation ?? null;
    const useD1 = shouldUseD1Direct();

    if (useD1) {
      const db = requireD1();

      const collectionRow = await db.prepare(
        `SELECT id, year_id, title, slug, status, location_id, order_index, updated_at FROM collections WHERE id = ?1 LIMIT 1`,
      ).bind(decodedCollectionId).first() as Record<string, unknown> | null;

      if (!collectionRow) {
        return notFound('找不到作品集。');
      }

      const yearId = String(collectionRow.year_id);
      const previousLocationId = collectionRow.location_id ? String(collectionRow.location_id) : null;

      if (targetLocationId === null) {
        await db.prepare(
          'UPDATE collections SET location_id = NULL, updated_at = ?1 WHERE id = ?2',
        ).bind(new Date().toISOString(), decodedCollectionId).run();
      } else {
        const location = await d1FindLocationById(targetLocationId);
        if (!location) {
          return notFound('找不到地點。');
        }
        if (location.year_id !== yearId) {
          return validationError('地點必須與作品集屬於同一年份。', 'locationId');
        }

        await db.prepare(
          'UPDATE collections SET location_id = ?1, updated_at = ?2 WHERE id = ?3',
        ).bind(location.id, new Date().toISOString(), decodedCollectionId).run();
      }

      const updated = await db.prepare(
        'SELECT id, year_id, title, slug, status, location_id, order_index, updated_at FROM collections WHERE id = ?1 LIMIT 1',
      ).bind(decodedCollectionId).first() as Record<string, unknown> | null;

      if (!updated) {
        return notFound('找不到作品集。');
      }

      await recordAudit(true, {
        action: updated.location_id ? 'link' : 'unlink',
        collectionId: decodedCollectionId,
        payload: { previousLocationId, locationId: updated.location_id ?? null },
      });

      await invalidateCaches(yearId, decodedCollectionId);

      return NextResponse.json(mapCollection(updated as CollectionRecord));
    }

    const { prisma } = await getNodeDb();

    const existing = await prisma.collection.findUnique({
      where: { id: decodedCollectionId },
      select: {
        id: true,
        year_id: true,
        title: true,
        slug: true,
        status: true,
        location_id: true,
        order_index: true,
        updated_at: true,
      },
    });

    if (!existing) {
      return notFound('找不到作品集。');
    }

    const previousLocationId = existing.location_id;
    let locationIdToApply = targetLocationId;

    if (targetLocationId === null) {
      locationIdToApply = null;
    } else if (targetLocationId) {
      const location = await prisma.location.findUnique({
        where: { id: targetLocationId },
        select: { id: true, year_id: true },
      });

      if (!location) {
        return notFound('找不到地點。');
      }

      if (location.year_id !== existing.year_id) {
        return validationError('地點必須與作品集屬於同一年份。', 'locationId');
      }

      locationIdToApply = location.id;
    }

    const updated = await prisma.collection.update({
      where: { id: decodedCollectionId },
      data: { location_id: locationIdToApply },
      select: {
        id: true,
        year_id: true,
        title: true,
        slug: true,
        status: true,
        location_id: true,
        order_index: true,
        updated_at: true,
      },
    });

    await recordAudit(false, {
      action: updated.location_id ? 'link' : 'unlink',
      collectionId: updated.id,
      payload: { previousLocationId, locationId: updated.location_id },
    });

    await invalidateCaches(updated.year_id, updated.id);

    return NextResponse.json(mapCollection(updated as CollectionRecord));
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('[POST assign collection location] unexpected error', error);
    return NextResponse.json({ error: 'internal_error', message: '更新作品集指派時發生錯誤。' }, { status: 500 });
  }
}

export const POST = postImpl as (
  request: NextRequest,
  context: RouteContext,
) => Promise<PostResult>;
