import { getD1Database } from '@/lib/cloudflare';
import {
  CreateLocationDraft,
  UpdateLocationDraft,
  LocationServiceError,
  UUID_REGEX,
} from '@/lib/location-service-shared';
import {
  LocationValidationError,
  normaliseLocationName,
  normaliseOptionalField,
  normaliseSlug,
  parseOrderIndex,
} from '@/lib/validators/location';

type D1Database = ReturnType<typeof getD1Database>;

export type D1Year = {
  id: string;
  label: string;
  order_index: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type D1LocationWithCounts = {
  id: string;
  year_id: string;
  slug: string;
  name: string;
  summary: string | null;
  cover_asset_id: string | null;
  order_index: string;
  created_at: string;
  updated_at: string;
  _count: { collections: number };
};

function requireDb(): D1Database {
  const db = getD1Database();
  if (!db) {
    throw new Error('D1 database not available');
  }
  return db;
}

function mapLocationRow(row: Record<string, unknown>): D1LocationWithCounts {
  return {
    id: String(row.id),
    year_id: String(row.year_id),
    slug: String(row.slug),
    name: String(row.name),
    summary: (row.summary ?? null) as string | null,
    cover_asset_id: (row.cover_asset_id ?? null) as string | null,
    order_index: String(row.order_index),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    _count: {
      collections: Number((row as { collection_count?: number | string }).collection_count ?? 0) || 0,
    },
  };
}

async function fetchLocationWithCounts(
  db: D1Database,
  yearId: string,
  locationId: string,
): Promise<D1LocationWithCounts | null> {
  const row = await db.prepare(
    `
      SELECT l.*,
        (
          SELECT COUNT(*)
          FROM collections c
          WHERE c.location_id = l.id
        ) AS collection_count
      FROM locations l
      WHERE l.year_id = ?1 AND l.id = ?2
      LIMIT 1
    `,
  ).bind(yearId, locationId).first();

  if (!row) {
    return null;
  }

  return mapLocationRow(row as Record<string, unknown>);
}

async function ensureSlugAvailable(
  db: D1Database,
  yearId: string,
  slug: string,
  ignoreId?: string,
) {
  const row = await db.prepare(
    `
      SELECT id
      FROM locations
      WHERE year_id = ?1 AND slug = ?2
      ${ignoreId ? 'AND id != ?3' : ''}
      LIMIT 1
    `,
  ).bind(yearId, slug, ...(ignoreId ? [ignoreId] : [])).first();

  if (row) {
    throw new LocationServiceError('CONFLICT', 'Slug 已被使用，請換一個。', 'slug');
  }
}

async function computeNextOrderIndex(db: D1Database, yearId: string): Promise<string> {
  const row = await db.prepare(
    `
      SELECT order_index
      FROM locations
      WHERE year_id = ?1
      ORDER BY order_index DESC
      LIMIT 1
    `,
  ).bind(yearId).first();

  const orderIndex = (row as { order_index?: string } | null)?.order_index;

  if (!orderIndex) {
    return '1.0';
  }

  const numeric = Number.parseFloat(orderIndex);
  if (Number.isFinite(numeric)) {
    return (numeric + 1).toFixed(1);
  }

  return `${Date.now()}.0`;
}

function handleValidationError(error: LocationValidationError): never {
  throw new LocationServiceError('VALIDATION', error.message, error.field);
}

export async function d1FindYearByIdentifier(identifier: string): Promise<D1Year | null> {
  if (!identifier) return null;

  const db = requireDb();
  const decoded = decodeURIComponent(identifier);

  const byId = await db.prepare(
    'SELECT * FROM years WHERE id = ?1 LIMIT 1',
  ).bind(decoded).first();
  if (byId) {
    return byId as D1Year;
  }

  const byLabel = await db.prepare(
    'SELECT * FROM years WHERE label = ?1 LIMIT 1',
  ).bind(decoded).first();

  return (byLabel ?? null) as D1Year | null;
}

export async function d1ListLocationsForYear(yearId: string): Promise<D1LocationWithCounts[]> {
  const db = requireDb();
  const result = await db.prepare(
    `
      SELECT l.*,
        (
          SELECT COUNT(*)
          FROM collections c
          WHERE c.location_id = l.id
        ) AS collection_count
      FROM locations l
      WHERE l.year_id = ?1
      ORDER BY l.order_index ASC
    `,
  ).bind(yearId).all();

  return (result.results ?? []).map((row: unknown) => mapLocationRow(row as Record<string, unknown>));
}

export async function d1FindLocationById(
  locationId: string,
): Promise<{ id: string; year_id: string } | null> {
  const db = requireDb();
  const row = await db.prepare(
    'SELECT id, year_id FROM locations WHERE id = ?1 LIMIT 1',
  ).bind(locationId).first();
  if (!row) {
    return null;
  }
  return {
    id: String(row.id),
    year_id: String(row.year_id),
  };
}

export async function d1CreateLocation(
  yearId: string,
  draft: CreateLocationDraft,
): Promise<D1LocationWithCounts> {
  const db = requireDb();

  try {
    const name = normaliseLocationName(draft.name);
    const slug = normaliseSlug(draft.slug);
    const summary = normaliseOptionalField(draft.summary);
    const coverAssetId = normaliseOptionalField(draft.coverAssetId);
    let orderIndex = parseOrderIndex(draft.orderIndex, { required: false });

    await ensureSlugAvailable(db, yearId, slug);

    if (!orderIndex) {
      orderIndex = await computeNextOrderIndex(db, yearId);
    }

    const id = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
    const now = new Date().toISOString();

    await db.prepare(
      `
        INSERT INTO locations (
          id,
          year_id,
          slug,
          name,
          summary,
          cover_asset_id,
          order_index,
          created_at,
          updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
      `,
    ).bind(
      id,
      yearId,
      slug,
      name,
      summary,
      coverAssetId,
      orderIndex,
      now,
      now,
    ).run();

    const created = await fetchLocationWithCounts(db, yearId, id);
    if (!created) {
      throw new Error('Failed to load created location');
    }
    return created;
  } catch (error) {
    if (error instanceof LocationValidationError) {
      handleValidationError(error);
    }
    throw error;
  }
}

export async function d1UpdateLocation(
  yearId: string,
  locationId: string,
  draft: UpdateLocationDraft,
): Promise<{ location: D1LocationWithCounts; changes: Record<string, unknown> }> {
  const db = requireDb();
  const existing = await fetchLocationWithCounts(db, yearId, locationId);

  if (!existing) {
    throw new LocationServiceError('NOT_FOUND', '找不到地點。');
  }

  try {
    const updates: string[] = [];
    const bindings: unknown[] = [];
    const auditPayload: Record<string, unknown> = {};
    let hasChanges = false;

    if (Object.prototype.hasOwnProperty.call(draft, 'name')) {
      const name = normaliseLocationName(draft.name);
      if (name !== existing.name) {
        updates.push('name = ?');
        bindings.push(name);
        auditPayload.name = name;
        hasChanges = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(draft, 'slug')) {
      const slug = normaliseSlug(draft.slug);
      if (slug !== existing.slug) {
        await ensureSlugAvailable(db, yearId, slug, locationId);
        updates.push('slug = ?');
        bindings.push(slug);
        auditPayload.slug = slug;
        hasChanges = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(draft, 'summary')) {
      const summary = normaliseOptionalField(draft.summary);
      if (summary !== existing.summary) {
        updates.push('summary = ?');
        bindings.push(summary);
        auditPayload.summary = summary;
        hasChanges = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(draft, 'coverAssetId')) {
      const coverAssetId = normaliseOptionalField(draft.coverAssetId);
      if (coverAssetId !== existing.cover_asset_id) {
        updates.push('cover_asset_id = ?');
        bindings.push(coverAssetId);
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
        updates.push('order_index = ?');
        bindings.push(orderIndex);
        auditPayload.orderIndex = orderIndex;
        hasChanges = true;
      }
    }

    if (!hasChanges) {
      throw new LocationServiceError('VALIDATION', '請提供至少一個要更新的欄位。');
    }

    const now = new Date().toISOString();
    updates.push('updated_at = ?');
    bindings.push(now, locationId, yearId);

    await db.prepare(
      `UPDATE locations
        SET ${updates.join(', ')}
       WHERE id = ? AND year_id = ?`,
    ).bind(...bindings).run();

    const updated = await fetchLocationWithCounts(db, yearId, locationId);
    if (!updated) {
      throw new Error('Failed to load updated location');
    }

    return { location: updated, changes: auditPayload };
  } catch (error) {
    if (error instanceof LocationValidationError) {
      handleValidationError(error);
    }
    throw error;
  }
}

export async function d1DeleteLocation(
  yearId: string,
  locationId: string,
): Promise<D1LocationWithCounts> {
  const db = requireDb();
  const existing = await fetchLocationWithCounts(db, yearId, locationId);

  if (!existing) {
    throw new LocationServiceError('NOT_FOUND', '找不到地點。');
  }

  if ((existing._count?.collections ?? 0) > 0) {
    throw new LocationServiceError('HAS_COLLECTIONS', '已有作品集指派至此地點，請先重新指派後再刪除。');
  }

  await db.prepare(
    'DELETE FROM locations WHERE id = ?1 AND year_id = ?2',
  ).bind(locationId, yearId).run();

  return existing;
}
