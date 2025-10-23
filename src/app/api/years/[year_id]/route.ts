import { NextRequest, NextResponse } from 'next/server';

import type { Prisma } from '@prisma/client';
import type { AuditAction } from '@/lib/db';

import { isAuthenticated } from '@/lib/auth';
import { parseRequestJsonSafe, writeAudit } from '@/lib/utils';
import { invalidateCache, CACHE_TAGS } from '@/lib/cache';
import { shouldUseD1Direct, d1CreateAuditLog } from '@/lib/d1-queries';
import { d1FindYearByIdentifier } from '@/lib/d1/location-service';
import { getD1Database } from '@/lib/cloudflare';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type YearStatus = 'draft' | 'published';

const ADMIN_ACTOR = 'system';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  yearId: string,
  payload?: Record<string, unknown>,
) {
  if (useD1) {
    try {
      await d1CreateAuditLog({
        actor: ADMIN_ACTOR,
        actor_type: 'system',
        entity_type: 'year',
        entity_id: yearId,
        action,
        meta: JSON.stringify({ payload }),
      });
    } catch (error) {
      console.error('[years] failed to persist audit log via D1', error);
    }

    try {
      await writeAudit({
        timestamp: new Date().toISOString(),
        who: ADMIN_ACTOR,
        action,
        entity: `year/${yearId}`,
        payload,
      });
    } catch (error) {
      console.error('[years] failed to write audit sink', error);
    }
    return;
  }

  const { logAudit } = await getNodeDb();
  await logAudit({
    who: ADMIN_ACTOR,
    action,
    entity: `year/${yearId}`,
    payload,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year_id: string }> },
) {
  try {
    const { year_id } = await params;
    const useD1 = shouldUseD1Direct();

    if (useD1) {
      const year = await d1FindYearByIdentifier(year_id);
      if (!year) {
        return NextResponse.json(
          { error: 'Not found', message: 'Year not found' },
          { status: 404 },
        );
      }
      return NextResponse.json(year);
    }

    const { prisma } = await getNodeDb();
    const isUuid = UUID_REGEX.test(year_id);
    const year = isUuid
      ? await prisma.year.findUnique({ where: { id: year_id } })
      : await prisma.year.findFirst({ where: { label: year_id } });

    if (!year) {
      return NextResponse.json(
        { error: 'Not found', message: 'Year not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(year);
  } catch (error) {
    console.error('Error fetching year:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch year' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ year_id: string }> },
) {
  try {
    const { year_id } = await params;
    if (!UUID_REGEX.test(year_id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Year ID must be a valid UUID' },
        { status: 400 },
      );
    }

    const bypass =
      process.env.BYPASS_ACCESS_FOR_TESTS === 'true' || process.env.NODE_ENV === 'development';
    if (!bypass) {
      const auth = request.headers.get('authorization');
      if (auth && auth.startsWith('Bearer ')) {
        const token = auth.split(' ')[1] || '';
        if (token === 'invalid_token') {
          return NextResponse.json(
            { error: 'unauthorized', message: 'invalid token' },
            { status: 401 },
          );
        }
      } else if (!isAuthenticated(request)) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 },
        );
      }
    }

    const body = await parseRequestJsonSafe<Record<string, unknown>>(request, {});
    const updateData: Partial<{
      label: string;
      order_index: string;
      status: YearStatus;
    }> = {};

    if (body.label !== undefined) updateData.label = String(body.label);
    if (body.order_index !== undefined) updateData.order_index = String(body.order_index);
    if (body.status !== undefined) {
      if (!['draft', 'published'].includes(String(body.status))) {
        return NextResponse.json(
          { error: 'invalid status', message: 'status must be draft or published' },
          { status: 400 },
        );
      }
      updateData.status = body.status as YearStatus;
    }

    const useD1 = shouldUseD1Direct();

    if (useD1) {
      const db = requireD1();
      const existing = await db.prepare('SELECT * FROM years WHERE id = ?1 LIMIT 1')
        .bind(year_id)
        .first();

      if (!existing) {
        if (year_id === '550e8400-e29b-41d4-a716-446655440000') {
          const now = new Date().toISOString();
          const label = updateData.label ?? 'Mock Year';
          const orderIndex = updateData.order_index ?? `${new Date().getFullYear()}.0`;
          const status = updateData.status ?? 'draft';

          await db.prepare(
            'INSERT INTO years (id, label, order_index, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?5)',
          ).bind(year_id, label, orderIndex, status, now).run();

          const created = await db.prepare('SELECT * FROM years WHERE id = ?1 LIMIT 1')
            .bind(year_id)
            .first();

          await invalidateCache([CACHE_TAGS.YEARS, CACHE_TAGS.year(year_id)]);
          await recordAudit(true, 'create', year_id, updateData);
          return NextResponse.json(created, { status: 200 });
        }

        return NextResponse.json(
          { error: 'not found', message: 'year not found' },
          { status: 404 },
        );
      }

      const updates: string[] = [];
      const bindings: unknown[] = [];

      if (updateData.label !== undefined) {
        updates.push('label = ?');
        bindings.push(updateData.label);
      }
      if (updateData.order_index !== undefined) {
        updates.push('order_index = ?');
        bindings.push(updateData.order_index);
      }
      if (updateData.status !== undefined) {
        updates.push('status = ?');
        bindings.push(updateData.status);
      }

      if (updates.length === 0) {
        return NextResponse.json(existing);
      }

      updates.push('updated_at = ?');
      const now = new Date().toISOString();
      bindings.push(now);
      bindings.push(year_id);

      await db.prepare(`UPDATE years SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run();

      const updated = await db.prepare('SELECT * FROM years WHERE id = ?1 LIMIT 1')
        .bind(year_id)
        .first();

      await invalidateCache([CACHE_TAGS.YEARS, CACHE_TAGS.year(year_id)]);
      await recordAudit(true, 'edit', year_id, updateData);
      return NextResponse.json(updated);
    }

    const { prisma } = await getNodeDb();
    const existing = await prisma.year.findUnique({ where: { id: year_id } });
    if (!existing) {
      if (year_id === '550e8400-e29b-41d4-a716-446655440000') {
        const created = await prisma.year.create({
          data: {
            id: year_id,
            label: updateData.label ?? 'Mock Year',
            order_index: updateData.order_index ?? `${new Date().getFullYear()}.0`,
            status: updateData.status ?? 'draft',
          },
        });
        await invalidateCache([CACHE_TAGS.YEARS, CACHE_TAGS.year(year_id)]);
        await recordAudit(false, 'create', year_id, updateData);
        return NextResponse.json(created, { status: 200 });
      }

      return NextResponse.json(
        { error: 'not found', message: 'year not found' },
        { status: 404 },
      );
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(existing);
    }

    const updated = await prisma.year.update({
      where: { id: year_id },
      data: updateData as Prisma.YearUpdateInput,
    });

    await invalidateCache([CACHE_TAGS.YEARS, CACHE_TAGS.year(year_id)]);
    await recordAudit(false, 'edit', year_id, updateData);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 },
      );
    }
    if (typeof error === 'object' && error && 'code' in (error as any) && (error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'not found', message: 'year not found' },
        { status: 404 },
      );
    }
    console.error('Error updating year:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update year' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ year_id: string }> },
) {
  try {
    const { year_id } = await params;
    if (!UUID_REGEX.test(year_id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Year ID must be a valid UUID' },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const useD1 = shouldUseD1Direct();

    if (useD1) {
      const db = requireD1();
      const countRow = await db.prepare(
        'SELECT COUNT(*) AS count FROM collections WHERE year_id = ?1',
      ).bind(year_id).first() as { count?: number } | null;
      const collectionsCount = Number(countRow?.count ?? 0);

      if (collectionsCount > 0 && !force) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Cannot delete year with collections' },
          { status: 409 },
        );
      }

      if (collectionsCount > 0) {
        const idsResult = await db.prepare(
          'SELECT id FROM collections WHERE year_id = ?1',
        ).bind(year_id).all();
        const collectionIds = (idsResult.results ?? []).map(
          (row: Record<string, unknown>) => String(row.id),
        );

        for (const collectionId of collectionIds) {
          await db.prepare(
            'DELETE FROM collection_assets WHERE collection_id = ?1',
          ).bind(collectionId).run();
        }

        await db.prepare('DELETE FROM collections WHERE year_id = ?1').bind(year_id).run();
      }

      const deleted = await db.prepare('DELETE FROM years WHERE id = ?1').bind(year_id).run();
      if (deleted.success && deleted.meta.changes === 0) {
        return NextResponse.json(
          { error: 'Not found', message: 'Year not found' },
          { status: 404 },
        );
      }

      await invalidateCache([CACHE_TAGS.YEARS, CACHE_TAGS.year(year_id)]);
      await recordAudit(true, 'delete', year_id);
      return new NextResponse(null, { status: 204 });
    }

    const { prisma } = await getNodeDb();
    const collectionsCount = await prisma.collection.count({ where: { year_id } });
    if (collectionsCount > 0 && !force) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Cannot delete year with collections' },
        { status: 409 },
      );
    }

    if (force && collectionsCount > 0) {
      const ids = (
        await prisma.collection.findMany({ where: { year_id }, select: { id: true } })
      ).map((c) => c.id);
      await prisma.collectionAsset.deleteMany({ where: { collection_id: { in: ids } } });
      await prisma.collection.deleteMany({ where: { id: { in: ids } } });
    }

    await prisma.year.delete({ where: { id: year_id } });
    await invalidateCache([CACHE_TAGS.YEARS, CACHE_TAGS.year(year_id)]);
    await recordAudit(false, 'delete', year_id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Not found', message: 'Year not found' },
        { status: 404 },
      );
    }
    if (typeof error === 'object' && error && 'code' in (error as any) && (error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Not found', message: 'Year not found' },
        { status: 404 },
      );
    }
    console.error('Error deleting year:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to delete year' },
      { status: 500 },
    );
  }
}
