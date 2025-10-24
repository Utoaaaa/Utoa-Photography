import { NextRequest, NextResponse } from 'next/server';

import { CACHE_TAGS, invalidateCache } from '@/lib/cache';
import { parseRequestJsonSafe, writeAudit } from '@/lib/utils';
import { shouldUseD1Direct, d1CreateAuditLog } from '@/lib/d1-queries';
import { d1FindYearByIdentifier, d1FindLocationById } from '@/lib/d1/location-service';
import { getD1Database } from '@/lib/cloudflare';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

interface ReorderPayload {
  yearId?: unknown;
  orderedIds?: unknown;
}

interface AdminLocationDto {
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
}

interface LocationRecord {
  id: string;
  year_id: string;
  name: string;
  slug: string;
  summary: string | null;
  cover_asset_id: string | null;
  order_index: string;
  created_at: Date | string;
  updated_at: Date | string;
  _count?: { collections?: number } | null;
}

function validationError(message: string, field?: string) {
  return NextResponse.json(field ? { error: 'validation_error', field, message } : { error: 'validation_error', message }, { status: 400 });
}

function mapLocation(record: LocationRecord): AdminLocationDto {
  return {
    id: record.id,
    yearId: record.year_id,
    name: record.name,
    slug: record.slug,
    summary: record.summary ?? null,
    coverAssetId: record.cover_asset_id ?? null,
    orderIndex: record.order_index,
    createdAt: record.created_at instanceof Date ? record.created_at.toISOString() : record.created_at,
    updatedAt: record.updated_at instanceof Date ? record.updated_at.toISOString() : record.updated_at,
    collectionCount: record._count?.collections ?? 0,
  };
}

async function recordAudit(
  useD1: boolean,
  params: { locationId: string; yearId: string; orderedIds: string[] },
) {
  const { locationId, yearId, orderedIds } = params;
  if (useD1) {
    try {
      await d1CreateAuditLog({
        actor: 'system',
        actor_type: 'system',
        entity_type: 'location',
        entity_id: locationId,
        action: 'sort',
        meta: JSON.stringify({ yearId, orderedIds }),
      });
    } catch (error) {
      console.error('[locations.reorder] failed to persist audit via D1', error);
    }

    try {
      await writeAudit({
        timestamp: new Date().toISOString(),
        who: 'system',
        action: 'sort',
        entity: `location/${locationId}`,
        payload: { yearId, orderedIds },
      });
    } catch (error) {
      console.error('[locations.reorder] failed to write audit sink', error);
    }
    return;
  }

  const { logAudit } = await getNodeDb();
  await logAudit({
    who: 'system',
    action: 'sort',
    entity: `location/${locationId}`,
    payload: { yearId, orderedIds },
  });
}

async function resolveYear(raw: string | undefined, useD1: boolean) {
  if (!raw) return null;
  const decoded = decodeURIComponent(raw);

  if (useD1) {
    const year = await d1FindYearByIdentifier(decoded);
    return year ? { id: year.id, label: year.label } : null;
  }

  const { prisma } = await getNodeDb();
  if (uuidRegex.test(decoded)) {
    const year = await prisma.year.findUnique({ where: { id: decoded } });
    if (year) return year;
  }
  return prisma.year.findFirst({ where: { label: decoded } });
}

function normaliseOrderedIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
  if (ids.length !== value.length) return null;
  if (ids.some((id) => !uuidRegex.test(id))) return null;
  return ids;
}

function buildOrderIndex(position: number): string {
  return `${(position + 1).toFixed(1)}`;
}

type RouteContext = {
  params: Promise<{ locationId?: string | string[] }>;
};

type RouteContextLike = {
  params: { locationId?: string | string[] } | Promise<{ locationId?: string | string[] }>;
};

async function invalidateYear(yearId: string) {
  try {
    await invalidateCache([
      CACHE_TAGS.YEARS,
      CACHE_TAGS.year(yearId),
      CACHE_TAGS.yearCollections(yearId),
    ]);
  } catch (error) {
    console.error('[locations.reorder] cache invalidation failed', error);
  }
}

async function postImpl(request: NextRequest, context: RouteContextLike) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawValue = resolvedParams?.locationId;
    const rawLocationId = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    const locationIdRaw = typeof rawLocationId === 'string' ? rawLocationId : '';
    const locationId = locationIdRaw ? decodeURIComponent(locationIdRaw) : '';

    if (!uuidRegex.test(locationId)) {
      return validationError('地點 ID 格式不正確。', 'locationId');
    }

    const body = await parseRequestJsonSafe<ReorderPayload>(request, {});
    const ids = normaliseOrderedIds(body.orderedIds);
    if (!ids || ids.length === 0) {
      return validationError('請提供有效的地點排序列表。', 'orderedIds');
    }

    const useD1 = shouldUseD1Direct();
    const year = await resolveYear(typeof body.yearId === 'string' ? body.yearId : undefined, useD1);
    if (!year) {
      return NextResponse.json({ error: 'not_found', message: '找不到指定的年份。' }, { status: 404 });
    }

    if (useD1) {
      const db = requireD1();

      const targetLocation = await d1FindLocationById(locationId);
      if (!targetLocation) {
        return NextResponse.json({ error: 'not_found', message: '找不到地點。' }, { status: 404 });
      }

      if (targetLocation.year_id !== year.id) {
        return validationError('地點不屬於指定年份。', 'yearId');
      }

      const existingLocationsResult = await db.prepare(
        'SELECT id FROM locations WHERE year_id = ?1 ORDER BY order_index ASC',
      ).bind(year.id).all();

      const existingLocations = (existingLocationsResult.results ?? []).map((row: Record<string, unknown>) => String(row.id));

      if (existingLocations.length !== ids.length) {
        return validationError('排序列表與現有地點數量不一致。', 'orderedIds');
      }

      const existingSet = new Set(existingLocations);
      const orderedSet = new Set(ids);
      if (existingSet.size !== orderedSet.size || [...existingSet].some((id) => !orderedSet.has(id))) {
        return validationError('排序列表包含不存在的地點。', 'orderedIds');
      }

      const now = new Date().toISOString();
      const statements = ids.map((id, index) =>
        db.prepare('UPDATE locations SET order_index = ?1, updated_at = ?2 WHERE id = ?3').bind(
          buildOrderIndex(index),
          now,
          id,
        ),
      );
      await db.batch(statements);

      const refreshedResult = await db.prepare(
        `
          SELECT
            l.*,
            (
              SELECT COUNT(*)
              FROM collections c
              WHERE c.location_id = l.id
            ) AS collections_count
          FROM locations l
          WHERE l.year_id = ?1
          ORDER BY l.order_index ASC
        `,
      ).bind(year.id).all();

      await recordAudit(true, { locationId, yearId: year.id, orderedIds: ids });
      await invalidateYear(year.id);

      return NextResponse.json(
        (refreshedResult.results ?? []).map((row: Record<string, unknown>) =>
          mapLocation({
            id: String(row.id),
            year_id: String(row.year_id),
            name: String(row.name),
            slug: String(row.slug),
            summary: (row.summary ?? null) as string | null,
            cover_asset_id: (row.cover_asset_id ?? null) as string | null,
            order_index: String(row.order_index),
            created_at: String(row.created_at ?? new Date().toISOString()),
            updated_at: String(row.updated_at ?? new Date().toISOString()),
            _count: { collections: Number(row.collections_count ?? 0) },
          } as LocationRecord),
        ),
      );
    }

    const { prisma } = await getNodeDb();

    const targetLocation = await prisma.location.findFirst({ where: { id: locationId } });
    if (!targetLocation) {
      return NextResponse.json({ error: 'not_found', message: '找不到地點。' }, { status: 404 });
    }

    if (targetLocation.year_id !== year.id) {
      return validationError('地點不屬於指定年份。', 'yearId');
    }

    const existingLocations = await prisma.location.findMany({
      where: { year_id: year.id },
      orderBy: { order_index: 'asc' },
      select: { id: true },
    });

    if (existingLocations.length !== ids.length) {
      return validationError('排序列表與現有地點數量不一致。', 'orderedIds');
    }

    const existingSet = new Set(existingLocations.map((item) => item.id));
    const orderedSet = new Set(ids);
    if (existingSet.size !== orderedSet.size || [...existingSet].some((id) => !orderedSet.has(id))) {
      return validationError('排序列表包含不存在的地點。', 'orderedIds');
    }

    await Promise.all(
      ids.map((id, index) =>
        prisma.location.update({
          where: { id },
          data: { order_index: buildOrderIndex(index) },
        }),
      ),
    );

    const refreshed = await prisma.location.findMany({
      where: { year_id: year.id },
      orderBy: { order_index: 'asc' },
      include: { _count: { select: { collections: true } } },
    });

    await recordAudit(false, { locationId, yearId: year.id, orderedIds: ids });
    await invalidateYear(year.id);

    return NextResponse.json(refreshed.map(mapLocation));
  } catch (error) {
    console.error('[POST locations.reorder] unexpected error', error);
    return NextResponse.json({ error: 'internal_error', message: '更新排序時發生錯誤。' }, { status: 500 });
  }
}

export const POST = postImpl as (
  request: NextRequest,
  context: RouteContext,
) => Promise<NextResponse<AdminLocationDto[] | { error: string; message: string; field?: string }> | Response>;
