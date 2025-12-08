import { NextRequest, NextResponse, after } from 'next/server';

import { requireAdminAuth } from '@/lib/auth';
import { shouldUseD1Direct } from '@/lib/d1-queries';
import { getD1Database } from '@/lib/cloudflare';
import { deleteR2ObjectsForAsset, listR2ImageIds } from '@/lib/r2-assets';

type PrismaClient = import('@prisma/client').PrismaClient;

let prismaPromise: Promise<PrismaClient> | null = null;

async function getPrisma() {
  if (!prismaPromise) {
    prismaPromise = import('@/lib/db').then(({ prisma }) => prisma);
  }
  return prismaPromise;
}

function requireD1() {
  const db = getD1Database();
  if (!db) {
    throw new Error('D1 database not available');
  }
  return db;
}

async function fetchExistingAssetIds(ids: string[], useD1: boolean): Promise<Set<string>> {
  if (ids.length === 0) {
    return new Set();
  }

  if (useD1) {
    const db = requireD1();
    const placeholders = ids.map(() => '?').join(', ');
    const query = `SELECT id FROM assets WHERE id IN (${placeholders})`;
    const result = await db.prepare(query).bind(...ids).all();
    const rows = (result.results ?? []) as { id: string }[];
    return new Set(rows.map((row) => String(row.id)));
  }

  const prisma = await getPrisma();
  const rows = await prisma.asset.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  return new Set(rows.map((row) => row.id));
}

type CleanupOptions = {
  limit: number;
  maxIterations: number;
  cursor?: string;
  dryRun: boolean;
};

async function runCleanupJob(options: CleanupOptions) {
  try {
    const useD1 = shouldUseD1Direct();
    let cursor = options.cursor;

    for (let iteration = 0; iteration < options.maxIterations; iteration += 1) {
      const { ids, nextCursor, truncated } = await listR2ImageIds(options.limit, cursor);
      if (ids.length === 0 && !truncated) {
        console.info('[r2-reconcile] no more objects found, ending job');
        break;
      }

      const existing = await fetchExistingAssetIds(ids, useD1);
      const orphaned = ids.filter((id) => !existing.has(id));

      if (orphaned.length > 0) {
        if (options.dryRun) {
          console.info('[r2-reconcile] dry run detected orphans', { orphaned });
        } else {
          await Promise.allSettled(
            orphaned.map(async (id) => {
              await deleteR2ObjectsForAsset(id);
            }),
          );
        }
      }

      console.info('[r2-reconcile] iteration complete', {
        iteration,
        scanned: ids.length,
        orphaned: orphaned.length,
        cursor: nextCursor ?? null,
        dryRun: options.dryRun,
      });

      if (!truncated || !nextCursor) {
        break;
      }
      cursor = nextCursor;
    }
  } catch (error) {
    console.error('[r2-reconcile] cleanup job failed', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireAdminAuth(request);
    const body = await request.json().catch(() => ({}));
    const rawLimit = Number(body?.limit ?? 500);
    const rawIterations = Number(body?.maxIterations ?? 5);
    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(500, Math.floor(rawLimit)))
      : 500; // keep under SQLite/D1 placeholder limit
    const maxIterations = Number.isFinite(rawIterations) ? Math.max(1, Math.min(20, Math.floor(rawIterations))) : 5;
    const cursor = typeof body?.cursor === 'string' && body.cursor.length > 0 ? body.cursor : undefined;
    const dryRun = Boolean(body?.dryRun);

    after(() => runCleanupJob({ limit, maxIterations, cursor, dryRun }));

    return NextResponse.json({
      status: 'scheduled',
      limit,
      maxIterations,
      cursor: cursor ?? null,
      dryRun,
    });
  } catch (error) {
    console.error('[r2-reconcile] failed to enqueue cleanup', error);
    return NextResponse.json({ error: 'internal_error', message: 'Failed to enqueue cleanup job' }, { status: 500 });
  }
}
