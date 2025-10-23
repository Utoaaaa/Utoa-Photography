import { NextRequest, NextResponse } from 'next/server';

import type { Prisma } from '@prisma/client';
import type { AuditAction } from '@/lib/db';

import { invalidateCache, CACHE_TAGS } from '@/lib/cache';
import { parseRequestJsonSafe, writeAudit } from '@/lib/utils';
import { shouldUseD1Direct, d1CreateAuditLog } from '@/lib/d1-queries';
import { d1FindYearByIdentifier, d1FindLocationById } from '@/lib/d1/location-service';
import { d1ListCollectionsForYear, d1CreateCollection } from '@/lib/d1/collection-service';

export const dynamic = 'force-dynamic';

type CollectionStatus = 'draft' | 'published' | 'all';

const ADMIN_ACTOR = 'system';

type YearLike = { id: string } & Record<string, unknown>;

type PrismaClient = import('@prisma/client').PrismaClient;
type LogAuditFn = typeof import('@/lib/db').logAudit;

let nodeDbPromise: Promise<{ prisma: PrismaClient; logAudit: LogAuditFn }> | null = null;

async function getNodeDb() {
  if (!nodeDbPromise) {
    nodeDbPromise = import('@/lib/db').then(({ prisma, logAudit }) => ({ prisma, logAudit }));
  }
  return nodeDbPromise;
}

async function ensureYear(yearIdentifier: string, useD1: boolean): Promise<YearLike | null> {
  if (useD1) {
    const year = await d1FindYearByIdentifier(yearIdentifier);
    return (year as YearLike) ?? null;
  }
  const { prisma } = await getNodeDb();
  return prisma.year.findUnique({ where: { id: yearIdentifier } }) as Promise<YearLike | null>;
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
      console.error('[collections] failed to persist audit log via D1', error);
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
      console.error('[collections] failed to write audit sink', error);
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year_id: string }> },
) {
  try {
    const { year_id } = await params;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[GET /years/:id/collections] year_id:', year_id, 'url:', request.url);
    }
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || 'all') as CollectionStatus;

    if (!['draft', 'published', 'all'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status', message: 'status must be draft|published|all' },
        { status: 400 },
      );
    }

    const useD1 = shouldUseD1Direct();
    const year = await ensureYear(year_id, useD1);
    if (!year) {
      return NextResponse.json({ error: 'Not found', message: 'Year not found' }, { status: 404 });
    }

    if (useD1) {
      const collections = await d1ListCollectionsForYear({ yearId: year.id, status });
      return NextResponse.json(collections);
    }

    const where: { year_id: string; status?: 'draft' | 'published' } = { year_id: year.id };
    if (status !== 'all') where.status = status;

    const { prisma } = await getNodeDb();
    const collections = await prisma.collection.findMany({
      where,
      orderBy: { order_index: 'asc' },
    });

    return NextResponse.json(collections);
  } catch (error) {
    console.error('Error listing collections by year:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ year_id: string }> },
) {
  try {
    const { year_id } = await params;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[POST /years/:id/collections] year_id:', year_id);
    }

    const body = await parseRequestJsonSafe<Record<string, unknown>>(request, {});
    const {
      slug,
      title,
      summary,
      status = 'draft',
      order_index,
      cover_asset_id,
      location_id: rawLocationId,
    } = body as {
      slug?: unknown;
      title?: unknown;
      summary?: unknown;
      status?: unknown;
      order_index?: unknown;
      cover_asset_id?: unknown;
      location_id?: unknown;
    };

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { error: 'missing required field', message: 'slug is required' },
        { status: 400 },
      );
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'invalid slug', message: 'slug must be lowercase letters, numbers, and hyphens only' },
        { status: 400 },
      );
    }
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'missing required field', message: 'title is required' },
        { status: 400 },
      );
    }
    if (title.length > 200) {
      return NextResponse.json(
        { error: 'invalid title', message: 'title must be a non-empty string up to 200 characters' },
        { status: 400 },
      );
    }
    if (status && !['draft', 'published'].includes(String(status))) {
      return NextResponse.json(
        { error: 'invalid status', message: 'status must be draft or published' },
        { status: 400 },
      );
    }

    const useD1 = shouldUseD1Direct();
    const year = await ensureYear(year_id, useD1);
    if (!year) {
      return NextResponse.json({ error: 'Not found', message: 'Year not found' }, { status: 404 });
    }

    let locationId: string | null = null;
    const normalizedStatus = (status || 'draft') as 'draft' | 'published';
    const finalOrderIndex = typeof order_index === 'string' && order_index.trim()
      ? order_index.trim()
      : '1.0';

    if (rawLocationId !== undefined) {
      if (rawLocationId === null || rawLocationId === '') {
        locationId = null;
      } else if (typeof rawLocationId === 'string') {
        if (useD1) {
          const location = await d1FindLocationById(rawLocationId);
          if (!location || location.year_id !== year.id) {
            return NextResponse.json(
              { error: 'invalid location', message: 'Location does not exist for this year' },
              { status: 400 },
            );
          }
          locationId = location.id;
        } else {
          const { prisma } = await getNodeDb();
          const location = await prisma.location.findUnique({
            where: { id: rawLocationId },
            select: { id: true, year_id: true },
          });
          if (!location || location.year_id !== year.id) {
            return NextResponse.json(
              { error: 'invalid location', message: 'Location does not exist for this year' },
              { status: 400 },
            );
          }
          locationId = location.id;
        }
      } else {
        return NextResponse.json(
          { error: 'invalid location', message: 'location_id must be a string or null' },
          { status: 400 },
        );
      }
    }

    if (useD1) {
      try {
        const created = await d1CreateCollection(year.id, {
          slug,
          title,
          summary: typeof summary === 'string' ? summary : null,
          status: normalizedStatus,
          order_index: finalOrderIndex,
          cover_asset_id: typeof cover_asset_id === 'string' ? cover_asset_id : null,
          location_id: locationId,
        });

        await invalidateCache([
          CACHE_TAGS.COLLECTIONS,
          CACHE_TAGS.yearCollections(year.id),
          CACHE_TAGS.year(year.id),
        ]);

        await recordAudit(true, {
          action: 'create',
          collectionId: created.id,
          payload: { slug: created.slug, year_id: year.id },
        });

        return NextResponse.json(created, { status: 201 });
      } catch (error) {
        if (error instanceof Error && /UNIQUE constraint/i.test(error.message)) {
          return NextResponse.json(
            { error: 'conflict', message: 'duplicate slug for this year' },
            { status: 409 },
          );
        }
        throw error;
      }
    }

    const { prisma } = await getNodeDb();
    const data: Prisma.CollectionUncheckedCreateInput = {
      year_id: year.id,
      slug,
      title,
      summary: typeof summary === 'string' ? summary : null,
      status: normalizedStatus,
      order_index: finalOrderIndex,
    };

    if (typeof cover_asset_id === 'string' && cover_asset_id.trim()) {
      data.cover_asset_id = cover_asset_id;
    }
    if (locationId) {
      data.location_id = locationId;
    }
    if (normalizedStatus === 'published') {
      data.published_at = new Date();
    }

    const created = await prisma.collection.create({ data });
    if (process.env.NODE_ENV !== 'production') {
      console.log('[POST /years/:id/collections] created collection:', created?.id, created?.slug);
    }

    await invalidateCache([
      CACHE_TAGS.COLLECTIONS,
      CACHE_TAGS.yearCollections(year.id),
      CACHE_TAGS.year(year.id),
    ]);

    await recordAudit(false, {
      action: 'create',
      collectionId: created.id,
      payload: { slug: created.slug, year_id: year.id },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'conflict', message: 'duplicate slug for this year' },
        { status: 409 },
      );
    }
    console.error('Error creating collection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
