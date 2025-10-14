import { NextRequest, NextResponse } from 'next/server';

import { prisma, logAudit } from '@/lib/db';
import { parseRequestJsonSafe } from '@/lib/utils';
import { assignCollectionLocation, isCollectionServiceError } from '@/lib/prisma/collection-service';
import { CACHE_TAGS, invalidateCache } from '@/lib/cache';

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

    const result = await assignCollectionLocation(decodedCollectionId, normalizedLocation ?? null, prisma);

    await logAudit({
      who: ADMIN_ACTOR,
      action: result.collection.location_id ? 'link' : 'unlink',
      entity: `collection/${result.collection.id}`,
      payload: { previousLocationId: result.previousLocationId, locationId: result.collection.location_id },
    });

    await invalidateCaches(result.collection.year_id, result.collection.id);

    return NextResponse.json(mapCollection(result.collection as CollectionRecord));
  } catch (error) {
    if (isCollectionServiceError(error)) {
      if (error.code === 'NOT_FOUND') {
        return notFound(error.message);
      }
      return validationError(error.message, error.field);
    }

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
