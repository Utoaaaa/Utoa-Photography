import type { Prisma, Location, Year } from '@prisma/client';
import { Prisma as PrismaNamespace } from '@prisma/client';

import { prisma } from '@/lib/db';
import {
  LocationValidationError,
  LOCATION_SLUG_REGEX,
  normaliseLocationName,
  normaliseOptionalField,
  normaliseSlug,
  parseOrderIndex,
} from '@/lib/validators/location';
import {
  CreateLocationDraft,
  UpdateLocationDraft,
  LocationServiceError,
  isLocationServiceError,
  UUID_REGEX,
  LOCATION_UUID_REGEX,
} from '@/lib/location-service-shared';

export type PrismaClientLike = Pick<
  typeof prisma,
  'location' | 'year'
>;

export type LocationWithCounts = Prisma.LocationGetPayload<{
  include: { _count: { select: { collections: true } } };
}>;

export async function findYearByIdentifier(identifier: string, db: PrismaClientLike = prisma): Promise<Year | null> {
  if (!identifier) return null;
  const decoded = decodeURIComponent(identifier);
  if (UUID_REGEX.test(decoded)) {
    const byId = await db.year.findUnique({ where: { id: decoded } });
    if (byId) return byId;
  }
  return db.year.findFirst({ where: { label: decoded } });
}

export async function listLocationsForYear(yearId: string, db: PrismaClientLike = prisma): Promise<LocationWithCounts[]> {
  return db.location.findMany({
    where: { year_id: yearId },
    orderBy: { order_index: 'asc' },
    include: { _count: { select: { collections: true } } },
  });
}

function handleValidationError(error: LocationValidationError): never {
  throw new LocationServiceError('VALIDATION', error.message, error.field);
}

async function ensureSlugAvailable(yearId: string, slug: string, db: PrismaClientLike, ignoreId?: string) {
  const existing = await db.location.findFirst({
    where: {
      year_id: yearId,
      slug,
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
    },
  });

  if (existing) {
    throw new LocationServiceError('CONFLICT', 'Slug 已被使用，請換一個。', 'slug');
  }
}

async function computeNextOrderIndex(yearId: string, db: PrismaClientLike): Promise<string> {
  const last = await db.location.findFirst({
    where: { year_id: yearId },
    orderBy: { order_index: 'desc' },
    select: { order_index: true },
  });

  if (!last || typeof last.order_index !== 'string') {
    return '1.0';
  }

  const numeric = Number.parseFloat(last.order_index);
  if (Number.isFinite(numeric)) {
    return (numeric + 1).toFixed(1);
  }

  return `${Date.now()}.0`;
}

export async function createLocation(
  yearId: string,
  draft: CreateLocationDraft,
  db: PrismaClientLike = prisma,
): Promise<LocationWithCounts> {
  try {
    const name = normaliseLocationName(draft.name);
    const slug = normaliseSlug(draft.slug);
    const summary = normaliseOptionalField(draft.summary);
    const coverAssetId = normaliseOptionalField(draft.coverAssetId);
    let orderIndex = parseOrderIndex(draft.orderIndex, { required: false });

    await ensureSlugAvailable(yearId, slug, db);

    if (!orderIndex) {
      orderIndex = await computeNextOrderIndex(yearId, db);
    }

    return db.location.create({
      data: {
        year_id: yearId,
        name,
        slug,
        summary,
        cover_asset_id: coverAssetId,
        order_index: orderIndex,
      },
      include: { _count: { select: { collections: true } } },
    });
  } catch (error) {
    if (error instanceof LocationValidationError) {
      handleValidationError(error);
    }
    if (error instanceof PrismaNamespace.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new LocationServiceError('CONFLICT', 'Slug 已被使用，請換一個。', 'slug');
    }
    throw error;
  }
}

export async function updateLocation(
  yearId: string,
  locationId: string,
  draft: UpdateLocationDraft,
  db: PrismaClientLike = prisma,
): Promise<{ location: LocationWithCounts; changes: Record<string, unknown> }> {
  const existing = await db.location.findFirst({ where: { id: locationId, year_id: yearId } });
  if (!existing) {
    throw new LocationServiceError('NOT_FOUND', '找不到地點。');
  }

  try {
    const prismaUpdates: {
      name?: string;
      slug?: string;
      summary?: string | null;
      cover_asset_id?: string | null;
      order_index?: string;
    } = {};

    const auditPayload: Record<string, unknown> = {};

    let hasChanges = false;

    if (Object.prototype.hasOwnProperty.call(draft, 'name')) {
      const name = normaliseLocationName(draft.name);
      if (name !== existing.name) {
        prismaUpdates.name = name;
        auditPayload.name = name;
        hasChanges = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(draft, 'slug')) {
      const slug = normaliseSlug(draft.slug);
      if (slug !== existing.slug) {
        await ensureSlugAvailable(yearId, slug, db, locationId);
        prismaUpdates.slug = slug;
        auditPayload.slug = slug;
        hasChanges = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(draft, 'summary')) {
      const summary = normaliseOptionalField(draft.summary);
      if (summary !== existing.summary) {
        prismaUpdates.summary = summary;
        auditPayload.summary = summary;
        hasChanges = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(draft, 'coverAssetId')) {
      const coverAssetId = normaliseOptionalField(draft.coverAssetId);
      if (coverAssetId !== existing.cover_asset_id) {
        prismaUpdates.cover_asset_id = coverAssetId;
        auditPayload.coverAssetId = coverAssetId;
        hasChanges = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(draft, 'orderIndex')) {
      const orderIndex = parseOrderIndex(draft.orderIndex, { required: true });
      if (orderIndex === null) {
        throw new LocationServiceError('VALIDATION', '排序值不可為空白。', 'orderIndex');
      }
      if (orderIndex !== existing.order_index) {
        prismaUpdates.order_index = orderIndex;
        auditPayload.orderIndex = orderIndex;
        hasChanges = true;
      }
    }

    if (!hasChanges) {
      throw new LocationServiceError('VALIDATION', '請提供至少一個要更新的欄位。');
    }

    const location = await db.location.update({
      where: { id: locationId },
      data: prismaUpdates,
      include: { _count: { select: { collections: true } } },
    });

    return { location, changes: auditPayload };
  } catch (error) {
    if (error instanceof LocationValidationError) {
      handleValidationError(error);
    }
    if (error instanceof PrismaNamespace.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new LocationServiceError('CONFLICT', 'Slug 已被使用，請換一個。', 'slug');
    }
    throw error;
  }
}

export async function deleteLocation(
  yearId: string,
  locationId: string,
  db: PrismaClientLike = prisma,
): Promise<Location> {
  const existing = await db.location.findFirst({
    where: { id: locationId, year_id: yearId },
    include: { _count: { select: { collections: true } } },
  });

  if (!existing) {
    throw new LocationServiceError('NOT_FOUND', '找不到地點。');
  }

  if ((existing._count?.collections ?? 0) > 0) {
    throw new LocationServiceError('HAS_COLLECTIONS', '已有作品集指派至此地點，請先重新指派後再刪除。');
  }

  return db.location.delete({ where: { id: locationId } });
}

export {
  LOCATION_UUID_REGEX,
  LocationServiceError,
  isLocationServiceError,
} from '@/lib/location-service-shared';
export type { CreateLocationDraft, UpdateLocationDraft } from '@/lib/location-service-shared';
export { LOCATION_SLUG_REGEX };
