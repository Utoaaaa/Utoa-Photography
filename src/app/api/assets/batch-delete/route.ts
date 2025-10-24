import { NextRequest, NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/auth';
import { invalidateCache, CACHE_TAGS } from '@/lib/cache';
import { shouldUseD1Direct, d1CreateAuditLog } from '@/lib/d1-queries';
import { getD1Database, getR2Bucket } from '@/lib/cloudflare';
import { writeAudit } from '@/lib/utils';

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

async function recordAudit(useD1: boolean, assetId: string) {
  if (useD1) {
    try {
      await d1CreateAuditLog({
        actor: 'system',
        actor_type: 'system',
        entity_type: 'asset',
        entity_id: assetId,
        action: 'delete',
        meta: JSON.stringify({}),
      });
    } catch (error) {
      console.error('[asset-batch-delete] failed to persist audit via D1', error);
    }

    try {
      await writeAudit({
        timestamp: new Date().toISOString(),
        who: 'system',
        action: 'delete',
        entity: `asset/${assetId}`,
      });
    } catch (error) {
      console.error('[asset-batch-delete] failed to write audit sink', error);
    }
    return;
  }

  const { logAudit } = await getNodeDb();
  await logAudit({ who: 'system', action: 'delete', entity: `asset/${assetId}` });
}

type FailedItem = { id: string; reason: 'not_found' | 'referenced' | 'error'; details?: any };

const R2_VARIANTS = ['thumb', 'small', 'medium', 'large', 'cover', 'og', 'blur'] as const;
const R2_EXTS = ['webp', 'avif', 'jpg', 'jpeg', 'png'] as const;

async function deleteR2ObjectsForAsset(assetId: string): Promise<void> {
  try {
    const bucket = getR2Bucket() as undefined | { delete?: (key: string) => Promise<void> };
    const deleteFn = bucket?.delete?.bind(bucket);
    if (!deleteFn) {
      return;
    }

    const keys: string[] = [];
    for (const ext of R2_EXTS) {
      keys.push(`images/${assetId}/original.${ext}`);
    }
    for (const variant of R2_VARIANTS) {
      for (const ext of R2_EXTS) {
        keys.push(`images/${assetId}/${variant}.${ext}`);
      }
    }

    await Promise.allSettled(
      keys.map(async (key) => {
        try {
          await deleteFn(key);
        } catch (error) {
          console.warn('[asset-batch-delete] failed to delete R2 object', { key, error });
        }
      }),
    );
  } catch (error) {
    console.warn('[asset-batch-delete] R2 cleanup skipped', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireAdminAuth(request);
    const body = await request.json().catch(() => ({})) as any;
    const asset_ids: unknown = body?.asset_ids;
    if (!Array.isArray(asset_ids) || asset_ids.length === 0 || !asset_ids.every((x) => typeof x === 'string')) {
      return NextResponse.json({ error: 'validation failed', message: 'asset_ids must be a non-empty string array' }, { status: 400 });
    }
    if (asset_ids.length > 20) {
      return NextResponse.json({ error: 'limit exceeded', message: 'Batch delete limit is 20', limit: 20 }, { status: 400 });
    }

    const useD1 = shouldUseD1Direct();

    const deletedIds: string[] = [];
    const r2CleanupQueue: string[] = [];
    const failed: FailedItem[] = [];

    for (const id of asset_ids) {
      try {
        if (useD1) {
          const db = requireD1();
          const existing = await db.prepare('SELECT id FROM assets WHERE id = ?1 LIMIT 1').bind(id).first();
          if (!existing) {
            failed.push({ id, reason: 'not_found' });
            continue;
          }

          const refs = await db.prepare(
            'SELECT collection_id FROM collection_assets WHERE asset_id = ?1 LIMIT 50',
          ).bind(id).all();
          const refRows = refs.results ?? [];
          if (refRows.length > 0) {
            failed.push({
              id,
              reason: 'referenced',
              details: {
                referenced_by: refRows.map((row: Record<string, unknown>) => String(row.collection_id)),
                count: refRows.length,
              },
            });
            continue;
          }

          await db.prepare('DELETE FROM assets WHERE id = ?1').bind(id).run();
          await recordAudit(true, id);
          deletedIds.push(id);
          r2CleanupQueue.push(id);
        } else {
          const { prisma } = await getNodeDb();
          const existing = await prisma.asset.findUnique({ where: { id } });
          if (!existing) {
            failed.push({ id, reason: 'not_found' });
            continue;
          }
          const refs = await prisma.collectionAsset.findMany({
            where: { asset_id: id },
            select: { collection_id: true },
          });
          if (refs.length > 0) {
            failed.push({
              id,
              reason: 'referenced',
              details: { referenced_by: refs.map((r) => r.collection_id), count: refs.length },
            });
            continue;
          }
          await prisma.asset.delete({ where: { id } });
          await recordAudit(false, id);
          deletedIds.push(id);
          r2CleanupQueue.push(id);
        }
      } catch (e: any) {
        failed.push({ id, reason: 'error', details: String(e?.message || e) });
      }
    }

    try {
      const tags = new Set<string>();
      tags.add(CACHE_TAGS.ASSETS);
      for (const id of deletedIds) tags.add(`${CACHE_TAGS.ASSETS}:${id}`);
      await invalidateCache(Array.from(tags));
    } catch {}

    if (r2CleanupQueue.length > 0) {
      await Promise.allSettled(r2CleanupQueue.map(deleteR2ObjectsForAsset));
    }

    return NextResponse.json({ deletedIds, failed, total: asset_ids.length }, { status: 200 });
  } catch (error) {
    console.error('batch-delete failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
