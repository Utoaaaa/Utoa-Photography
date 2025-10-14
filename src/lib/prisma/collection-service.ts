import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PrismaClientLike = Pick<typeof prisma, 'collection' | 'location'>;

export type CollectionAssignment = Prisma.CollectionGetPayload<{
  select: {
    id: true;
    year_id: true;
    title: true;
    slug: true;
    status: true;
    location_id: true;
    order_index: true;
    updated_at: true;
  };
}>;

export type CollectionServiceErrorCode = 'VALIDATION' | 'NOT_FOUND';

export class CollectionServiceError extends Error {
  code: CollectionServiceErrorCode;
  field?: string;

  constructor(code: CollectionServiceErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'CollectionServiceError';
    this.code = code;
    this.field = field;
  }
}

export function isCollectionServiceError(error: unknown): error is CollectionServiceError {
  return error instanceof CollectionServiceError;
}

function validateCollectionId(collectionId: string): string {
  const trimmed = collectionId.trim();
  if (!UUID_REGEX.test(trimmed)) {
    throw new CollectionServiceError('VALIDATION', 'Collection ID 格式不正確。', 'collectionId');
  }
  return trimmed;
}

function normalizeLocationId(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (!UUID_REGEX.test(trimmed)) {
    throw new CollectionServiceError('VALIDATION', '地點 ID 格式不正確。', 'locationId');
  }
  return trimmed;
}

const assignmentSelect = {
  id: true,
  year_id: true,
  title: true,
  slug: true,
  status: true,
  location_id: true,
  order_index: true,
  updated_at: true,
} as const;

export async function assignCollectionLocation(
  collectionId: string,
  locationId: string | null,
  db: PrismaClientLike = prisma,
): Promise<{ collection: CollectionAssignment; previousLocationId: string | null }> {
  const validCollectionId = validateCollectionId(collectionId);
  const normalizedLocationId = normalizeLocationId(locationId);

  const existing = await db.collection.findUnique({
    where: { id: validCollectionId },
    select: {
      ...assignmentSelect,
    },
  });

  if (!existing) {
    throw new CollectionServiceError('NOT_FOUND', '找不到作品集。');
  }

  const previousLocationId = existing.location_id;

  if (normalizedLocationId === null) {
    const updated = await db.collection.update({
      where: { id: validCollectionId },
      data: { location_id: null },
      select: assignmentSelect,
    });

    return { collection: updated, previousLocationId };
  }

  const location = await db.location.findUnique({
    where: { id: normalizedLocationId },
    select: { id: true, year_id: true },
  });

  if (!location) {
    throw new CollectionServiceError('NOT_FOUND', '找不到地點。', 'locationId');
  }

  if (location.year_id !== existing.year_id) {
    throw new CollectionServiceError('VALIDATION', '地點必須與作品集屬於同一年份。', 'locationId');
  }

  const updated = await db.collection.update({
    where: { id: validCollectionId },
    data: { location_id: location.id },
    select: assignmentSelect,
  });

  return { collection: updated, previousLocationId };
}