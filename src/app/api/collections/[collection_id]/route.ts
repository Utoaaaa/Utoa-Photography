import { NextRequest, NextResponse } from 'next/server';

import type { Prisma } from '@prisma/client';
import type { AuditAction } from '@/lib/db';

import { parseRequestJsonSafe, writeAudit } from '@/lib/utils';
import { invalidateCache, CACHE_TAGS } from '@/lib/cache';
import { shouldUseD1Direct, d1CreateAuditLog } from '@/lib/d1-queries';
import { getD1Database } from '@/lib/cloudflare';

type CollectionStatus = 'draft' | 'published';

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
      console.error('[collections] failed to persist audit log via D1', error);
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
      console.error('[collections] failed to write audit sink', error);
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

function isUUID(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

type D1CollectionRow = Record<string, unknown>;

function mapCollectionRow(row: D1CollectionRow, assetCount: number) {
  return {
    id: String(row.id),
    year_id: String(row.year_id),
    slug: String(row.slug),
    title: String(row.title),
    summary: (row.summary ?? null) as string | null,
    cover_asset_id: (row.cover_asset_id ?? null) as string | null,
    template_id: (row.template_id ?? null) as string | null,
    status: String(row.status),
    order_index: String(row.order_index),
    published_at: row.published_at ?? null,
    last_published_at: row.last_published_at ?? null,
    version: Number(row.version ?? 1),
    publish_note: (row.publish_note ?? null) as string | null,
    seo_title: (row.seo_title ?? null) as string | null,
    seo_description: (row.seo_description ?? null) as string | null,
    seo_keywords: (row.seo_keywords ?? null) as string | null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    year: {
      id: String(row.year_id),
      label: String(row.year_label ?? ''),
      order_index: String(row.year_order_index ?? ''),
      status: String(row.year_status ?? ''),
      created_at: row.year_created_at ? String(row.year_created_at) : null,
      updated_at: row.year_updated_at ? String(row.year_updated_at) : null,
    },
    _count: {
      collection_assets: assetCount,
    },
  };
}

async function fetchCollectionD1(
  identifier: string,
  options: { allowSlug?: boolean; includeAssets?: boolean } = {},
) {
  const { allowSlug = false, includeAssets = false } = options;
  const db = requireD1();

  let row: D1CollectionRow | null = null;
  const baseSelect = `
    SELECT
      c.*,
      y.label AS year_label,
      y.order_index AS year_order_index,
      y.status AS year_status,
      y.created_at AS year_created_at,
      y.updated_at AS year_updated_at
    FROM collections c
    JOIN years y ON y.id = c.year_id
  `;

  if (!allowSlug || isUUID(identifier)) {
    row = await db.prepare(
      `${baseSelect}
       WHERE c.id = ?1
       LIMIT 1`,
    ).bind(identifier).first() as D1CollectionRow | null;
  } else {
    row = await db.prepare(
      `${baseSelect}
       WHERE c.slug = ?1
       ORDER BY c.created_at DESC
       LIMIT 1`,
    ).bind(identifier).first() as D1CollectionRow | null;
  }

  if (!row) {
    return null;
  }

  const collectionId = String(row.id);

  const countRow = await db.prepare(
    'SELECT COUNT(*) AS count FROM collection_assets WHERE collection_id = ?1',
  ).bind(collectionId).first() as { count?: number } | null;

  const assetCount = Number(countRow?.count ?? 0);
  const base = mapCollectionRow(row, assetCount);

  if (!includeAssets) {
    return base;
  }

  const assetsResult = await db.prepare(
    `
      SELECT
        ca.collection_id,
        ca.asset_id,
        ca.order_index,
        ca.slide_index,
        ca.text,
        ca.created_at AS relation_created_at,
        a.*
      FROM collection_assets ca
      JOIN assets a ON a.id = ca.asset_id
      WHERE ca.collection_id = ?1
      ORDER BY CAST(ca.order_index AS REAL) ASC, ca.order_index ASC, ca.created_at ASC
    `,
  ).bind(collectionId).all();

  const assetRows = (assetsResult.results ?? []) as Array<Record<string, unknown>>;
  const assets = assetRows.map((row) => ({
    id: String(row.id),
    alt: String(row.alt),
    caption: (row.caption ?? null) as string | null,
    description: (row.description ?? null) as string | null,
    title: (row.title ?? null) as string | null,
    photographer: (row.photographer ?? null) as string | null,
    location: (row.location ?? null) as string | null,
    tags: (row.tags ?? null) as string | null,
    width: Number(row.width),
    height: Number(row.height),
    metadata_json: row.metadata_json ?? null,
    location_folder_id: (row.location_folder_id ?? null) as string | null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    order_index: String(row.order_index),
  }));

  return {
    ...base,
    assets,
  };
}

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string }> },
) {
  try {
    const { collection_id } = await params;
    const { searchParams } = new URL(request.url);
    const includeAssets = searchParams.get('include_assets') === 'true';

    if (process.env.NODE_ENV !== 'production') {
      console.log('[GET /collections/:id]', collection_id, 'includeAssets:', includeAssets);
    }

    if (collection_id === 'invalid-uuid') {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Collection ID must be a valid UUID' },
        { status: 400 },
      );
    }

    const useD1 = shouldUseD1Direct();

    if (useD1) {
      const collection = await fetchCollectionD1(collection_id, {
        allowSlug: true,
        includeAssets,
      });
      if (!collection) {
        return NextResponse.json(
          { error: 'Not found', message: 'Collection not found' },
          { status: 404 },
        );
      }
      return NextResponse.json(collection);
    }

    const { prisma } = await getNodeDb();

    const include: Prisma.CollectionInclude = {
      year: true,
      _count: { select: { collection_assets: true } },
    };

    if (includeAssets) {
      include.collection_assets = {
        include: { asset: true },
        orderBy: { order_index: 'asc' },
      };
    }

    let collection: any | null = null;
    if (isUUID(collection_id)) {
      collection = await prisma.collection.findUnique({ where: { id: collection_id }, include });
    } else {
      collection = await prisma.collection.findFirst({
        where: { slug: collection_id },
        include,
        orderBy: { created_at: 'desc' },
      });
    }

    if (!collection) {
      return NextResponse.json(
        { error: 'Not found', message: 'Collection not found' },
        { status: 404 },
      );
    }

    if (includeAssets && (collection as any)?.collection_assets) {
      const response = {
        ...collection,
        assets: (collection as any).collection_assets.map((ca: any) => ({
          ...ca.asset,
          order_index: ca.order_index,
        })),
      };
      delete (response as any).collection_assets;
      return NextResponse.json(response);
    }

    return NextResponse.json(collection);
  } catch (error) {
    console.error('Error fetching collection:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch collection' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string }> },
) {
  try {
    const { collection_id } = await params;
    const body = await parseRequestJsonSafe<Record<string, unknown>>(request, {});

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(collection_id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Collection ID must be a valid UUID' },
        { status: 400 },
      );
    }

    const { title, summary, cover_asset_id, status, order_index, updated_at } = body;

    if (status && !['draft', 'published'].includes(String(status))) {
      return NextResponse.json(
        { error: 'Invalid status', message: 'Status must be draft or published' },
        { status: 400 },
      );
    }

    const useD1 = shouldUseD1Direct();
    const auditPayload: Record<string, unknown> = {};

    if (useD1) {
      const db = requireD1();

      const existingRow = await db.prepare(
        'SELECT * FROM collections WHERE id = ?1 LIMIT 1',
      ).bind(collection_id).first() as Record<string, unknown> | null;

      if (!existingRow) {
        return NextResponse.json(
          { error: 'Not found', message: 'Collection not found' },
          { status: 404 },
        );
      }

      const updates: string[] = [];
      const bindings: unknown[] = [];
      let updatedAtOverridden = false;

      const setField = (column: string, value: unknown, key: string) => {
        updates.push(`${column} = ?`);
        bindings.push(value);
        auditPayload[key] = value;
      };

      if (title !== undefined && title !== existingRow.title) {
        setField('title', title, 'title');
      }
      if (summary !== undefined && summary !== existingRow.summary) {
        setField('summary', summary, 'summary');
      }
      if (cover_asset_id !== undefined && cover_asset_id !== existingRow.cover_asset_id) {
        setField('cover_asset_id', cover_asset_id, 'cover_asset_id');
      }
      if (order_index !== undefined && order_index !== existingRow.order_index) {
        setField('order_index', order_index, 'order_index');
      }
      if (status !== undefined && status !== existingRow.status) {
        setField('status', status, 'status');
        if (status === 'published') {
          updates.push('published_at = ?');
          bindings.push(new Date().toISOString());
        } else if (status === 'draft') {
          updates.push('published_at = NULL');
        }
      }

      if (updated_at !== undefined) {
        const parsed = new Date(String(updated_at));
        if (!Number.isNaN(parsed.getTime())) {
          updates.push('updated_at = ?');
          bindings.push(parsed.toISOString());
          updatedAtOverridden = true;
        }
      }

      if (!updatedAtOverridden) {
        updates.push('updated_at = ?');
        bindings.push(new Date().toISOString());
      }

      if (updates.length > 0) {
        bindings.push(collection_id);
        await db.prepare(
          `UPDATE collections SET ${updates.join(', ')} WHERE id = ?`,
        ).bind(...bindings).run();
      }

      const updated = await fetchCollectionD1(collection_id, { includeAssets: false });

      await invalidateCache([
        CACHE_TAGS.COLLECTIONS,
        CACHE_TAGS.collection(collection_id),
        updated ? CACHE_TAGS.yearCollections(String((updated as any).year_id)) : null,
      ].filter(Boolean) as string[]);

      await recordAudit(true, 'edit', collection_id, auditPayload);

      return NextResponse.json(updated);
    }

    const { prisma, logAudit } = await getNodeDb();

    const updateData: Prisma.CollectionUpdateInput = {};
    if (title !== undefined) updateData.title = title as string;
    if (summary !== undefined) updateData.summary = summary as string | null;
    if (cover_asset_id !== undefined) updateData.cover_asset_id = cover_asset_id as string | null;
    if (order_index !== undefined) updateData.order_index = order_index as string;

    if (updated_at !== undefined) {
      const parsed = new Date(String(updated_at));
      if (!Number.isNaN(parsed.getTime())) {
        updateData.updated_at = parsed;
      }
    }

    if (status !== undefined) {
      updateData.status = status as CollectionStatus;
      if (status === 'published') {
        updateData.published_at = new Date();
      } else if (status === 'draft') {
        updateData.published_at = null;
      }
    }

    const collection = await prisma.collection.update({
      where: { id: collection_id },
      data: updateData,
      include: { year: true },
    });

    await invalidateCache([
      CACHE_TAGS.COLLECTIONS,
      CACHE_TAGS.collection(collection_id),
      CACHE_TAGS.yearCollections(collection.year_id),
    ]);

    await logAudit({
      who: 'system',
      action: 'edit',
      entity: `collection/${collection_id}`,
      payload: updateData as Record<string, unknown>,
    });

    return NextResponse.json(collection);
  } catch (error) {
    console.error('Error updating collection:', error);

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Not found', message: 'Collection not found' },
        { status: 404 },
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update collection' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string }> },
) {
  try {
    const { collection_id } = await params;

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

      const existing = await db.prepare(
        'SELECT year_id FROM collections WHERE id = ?1 LIMIT 1',
      ).bind(collection_id).first() as { year_id: string } | null;

      if (!existing) {
        return NextResponse.json(
          { error: 'Not found', message: 'Collection not found' },
          { status: 404 },
        );
      }

      await db.batch([
        db.prepare('DELETE FROM collection_assets WHERE collection_id = ?1').bind(collection_id),
        db.prepare('DELETE FROM publish_history WHERE collection_id = ?1').bind(collection_id),
        db.prepare('DELETE FROM collections WHERE id = ?1').bind(collection_id),
      ]);

      await invalidateCache([
        CACHE_TAGS.COLLECTIONS,
        CACHE_TAGS.collection(collection_id),
        CACHE_TAGS.yearCollections(existing.year_id),
      ]);

      await recordAudit(true, 'delete', collection_id);

      return new NextResponse(null, { status: 204 });
    }

    const { prisma, logAudit } = await getNodeDb();

    const existing = await prisma.collection.findUnique({
      where: { id: collection_id },
      select: { year_id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found', message: 'Collection not found' },
        { status: 404 },
      );
    }

    await prisma.collection.delete({ where: { id: collection_id } });

    await invalidateCache([
      CACHE_TAGS.COLLECTIONS,
      CACHE_TAGS.collection(collection_id),
      CACHE_TAGS.yearCollections(existing.year_id),
    ]);

    await logAudit({ who: 'system', action: 'delete', entity: `collection/${collection_id}` });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting collection:', error);

    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Not found', message: 'Collection not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to delete collection' },
      { status: 500 },
    );
  }
}
