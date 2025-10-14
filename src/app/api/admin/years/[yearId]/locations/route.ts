import { NextRequest, NextResponse } from 'next/server';

import { logAudit } from '@/lib/db';
import { parseRequestJsonSafe } from '@/lib/utils';
import { CACHE_TAGS, invalidateCache } from '@/lib/cache';
import {
  createLocation,
  deleteLocation,
  findYearByIdentifier,
  isLocationServiceError,
  listLocationsForYear,
  LocationServiceError,
  LOCATION_UUID_REGEX,
  updateLocation,
  type CreateLocationDraft,
  type LocationWithCounts,
} from '@/lib/prisma/location-service';

const ADMIN_ACTOR = 'system';

type RouteContext = {
  params: Promise<{ yearId?: string | string[] }>;
};

type RouteContextLike = {
  params: { yearId?: string | string[] } | Promise<{ yearId?: string | string[] }>;
};

type LocationPayload = CreateLocationDraft & { id?: unknown };

type AdminLocationDto = {
  id: string;
  yearId: string;
  name: string;
  slug: string;
  summary: string | null;
  coverAssetId: string | null;
  orderIndex: string;
  createdAt: string;
  updatedAt: string;
  collectionCount: number;
};

type JsonResponse<T> = NextResponse<T>;

function toIsoString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }
  return parsed.toISOString();
}

function mapLocation(record: LocationWithCounts): AdminLocationDto {
  return {
    id: record.id,
    yearId: record.year_id,
    name: record.name,
    slug: record.slug,
    summary: record.summary ?? null,
    coverAssetId: record.cover_asset_id ?? null,
    orderIndex: record.order_index,
    createdAt: toIsoString(record.created_at),
    updatedAt: toIsoString(record.updated_at),
    collectionCount: record._count?.collections ?? 0,
  };
}

async function invalidateYearCaches(yearId: string) {
  try {
    await invalidateCache([
      CACHE_TAGS.YEARS,
      CACHE_TAGS.year(yearId),
      CACHE_TAGS.yearCollections(yearId),
    ]);
  } catch (error) {
    console.error('[locations] cache invalidation failed:', error);
  }
}

function respondToServiceError(error: LocationServiceError) {
  if (error.code === 'VALIDATION') {
    return NextResponse.json(
      error.field
        ? { error: 'validation_error', field: error.field, message: error.message }
        : { error: 'validation_error', message: error.message },
      { status: 400 },
    );
  }

  if (error.code === 'CONFLICT') {
    return NextResponse.json(
      { error: 'conflict', field: error.field, message: error.message },
      { status: 409 },
    );
  }

  if (error.code === 'HAS_COLLECTIONS') {
    return NextResponse.json(
      { error: 'conflict', message: error.message },
      { status: 409 },
    );
  }

  return NextResponse.json(
    { error: 'not_found', message: error.message },
    { status: 404 },
  );
}

async function resolveYear(context: RouteContextLike) {
  const resolvedParams = await Promise.resolve(context.params);
  const raw = resolvedParams?.yearId;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const yearParam = typeof value === 'string' ? decodeURIComponent(value) : '';
  if (!yearParam) {
    return { yearParam, year: null } as const;
  }

  const year = await findYearByIdentifier(yearParam);
  return { yearParam, year } as const;
}

function notFoundYear() {
  return NextResponse.json({ error: 'not_found', message: '找不到指定的年份。' }, { status: 404 });
}

function validationError(message: string, field?: string) {
  return NextResponse.json(
    field ? { error: 'validation_error', field, message } : { error: 'validation_error', message },
    { status: 400 },
  );
}

async function getImpl(_request: NextRequest, context: RouteContextLike) {
  try {
    const { year } = await resolveYear(context);
    if (!year) {
      return notFoundYear();
    }

    const locations = await listLocationsForYear(year.id);
    return NextResponse.json(locations.map(mapLocation));
  } catch (error) {
    console.error('[GET locations] unexpected error', error);
    return NextResponse.json({ error: 'internal_error', message: '無法載入地點列表。' }, { status: 500 });
  }
}

async function postImpl(request: NextRequest, context: RouteContextLike) {
  try {
    const { year } = await resolveYear(context);
    if (!year) {
      return notFoundYear();
    }

    const body = await parseRequestJsonSafe<LocationPayload>(request, {});
    const created = await createLocation(year.id, body);

    await logAudit({
      who: ADMIN_ACTOR,
      action: 'create',
      entity: `location/${created.id}`,
      payload: { yearId: year.id, locationId: created.id },
    });

    await invalidateYearCaches(year.id);
    return NextResponse.json(mapLocation(created), { status: 201 });
  } catch (error) {
    if (isLocationServiceError(error)) {
      return respondToServiceError(error);
    }
    console.error('[POST locations] unexpected error', error);
    return NextResponse.json({ error: 'internal_error', message: '建立地點時發生錯誤。' }, { status: 500 });
  }
}

async function putImpl(request: NextRequest, context: RouteContextLike) {
  try {
    const { year } = await resolveYear(context);
    if (!year) {
      return notFoundYear();
    }

    const body = await parseRequestJsonSafe<LocationPayload>(request, {});
    const idValue = typeof body.id === 'string' ? body.id.trim() : null;
    if (!idValue || !LOCATION_UUID_REGEX.test(idValue)) {
      return NextResponse.json(
        { error: 'validation_error', field: 'id', message: '缺少有效的地點 ID。' },
        { status: 400 },
      );
    }

    const { location, changes } = await updateLocation(year.id, idValue, body);

    await logAudit({
      who: ADMIN_ACTOR,
      action: 'edit',
      entity: `location/${idValue}`,
      payload: changes,
    });

    await invalidateYearCaches(year.id);
    return NextResponse.json(mapLocation(location));
  } catch (error) {
    if (isLocationServiceError(error)) {
      return respondToServiceError(error);
    }
    console.error('[PUT locations] unexpected error', error);
    return NextResponse.json({ error: 'internal_error', message: '更新地點時發生錯誤。' }, { status: 500 });
  }
}

async function deleteImpl(request: NextRequest, context: RouteContextLike) {
  try {
    const { year } = await resolveYear(context);
    if (!year) {
      return notFoundYear();
    }

    const body = await parseRequestJsonSafe<LocationPayload>(request, {});
    const idValue = typeof body.id === 'string' ? body.id.trim() : null;
    if (!idValue || !LOCATION_UUID_REGEX.test(idValue)) {
      return NextResponse.json(
        { error: 'validation_error', field: 'id', message: '缺少有效的地點 ID。' },
        { status: 400 },
      );
    }

    await deleteLocation(year.id, idValue);

    await logAudit({ who: ADMIN_ACTOR, action: 'delete', entity: `location/${idValue}` });
    await invalidateYearCaches(year.id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (isLocationServiceError(error)) {
      return respondToServiceError(error);
    }
    console.error('[DELETE locations] unexpected error', error);
    return NextResponse.json({ error: 'internal_error', message: '刪除地點時發生錯誤。' }, { status: 500 });
  }
}

export const GET = getImpl as (
  request: NextRequest,
  context: RouteContext,
) => Promise<JsonResponse<AdminLocationDto[] | { error: string; message: string }> | Response>;

export const POST = postImpl as (
  request: NextRequest,
  context: RouteContext,
) => Promise<JsonResponse<AdminLocationDto | { error: string; message: string; field?: string }> | Response>;

export const PUT = putImpl as (
  request: NextRequest,
  context: RouteContext,
) => Promise<JsonResponse<AdminLocationDto | { error: string; message: string; field?: string }> | Response>;

export const DELETE = deleteImpl as (
  request: NextRequest,
  context: RouteContext,
) => Promise<Response | JsonResponse<{ error: string; message: string; field?: string }>>;
