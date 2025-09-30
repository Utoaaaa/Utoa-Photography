import { NextRequest, NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { invalidateCache, CACHE_TAGS } from '@/lib/cache';

type FailedItem = { id: string; reason: 'not_found' | 'referenced' | 'error'; details?: any };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const asset_ids: unknown = body?.asset_ids;
    if (!Array.isArray(asset_ids) || asset_ids.length === 0 || !asset_ids.every((x) => typeof x === 'string')) {
      return NextResponse.json({ error: 'validation failed', message: 'asset_ids must be a non-empty string array' }, { status: 400 });
    }
    if (asset_ids.length > 20) {
      return NextResponse.json({ error: 'limit exceeded', message: 'Batch delete limit is 20', limit: 20 }, { status: 400 });
    }

    const deletedIds: string[] = [];
    const failed: FailedItem[] = [];

    for (const id of asset_ids) {
      try {
        const existing = await prisma.asset.findUnique({ where: { id } });
        if (!existing) {
          failed.push({ id, reason: 'not_found' });
          continue;
        }
        const refs = await prisma.collectionAsset.findMany({ where: { asset_id: id }, select: { collection_id: true } });
        if (refs.length > 0) {
          failed.push({ id, reason: 'referenced', details: { referenced_by: refs.map((r) => r.collection_id), count: refs.length } });
          continue;
        }
        await prisma.asset.delete({ where: { id } });
        await logAudit({ who: 'system', action: 'delete', entity: `asset/${id}` });
        deletedIds.push(id);
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

    return NextResponse.json({ deletedIds, failed, total: asset_ids.length }, { status: 200 });
  } catch (error) {
    console.error('batch-delete failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
