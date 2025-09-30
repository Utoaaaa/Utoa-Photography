import { NextRequest, NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { parseRequestJsonSafe } from '@/lib/utils';
import { invalidateCache, CACHE_TAGS } from '@/lib/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ asset_id: string }> }
) {
  try {
    const { asset_id } = await params;
    const asset = await prisma.asset.findUnique({ where: { id: asset_id } });
    if (!asset) {
      return NextResponse.json({ error: 'Not found', message: 'Asset not found' }, { status: 404 });
    }

    const response: any = { ...asset };
    if (response.metadata_json && typeof response.metadata_json === 'string') {
      try { response.metadata_json = JSON.parse(response.metadata_json); } catch {}
    }
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ asset_id: string }> }
) {
  try {
    const { asset_id } = await params;

    const existing = await prisma.asset.findUnique({ where: { id: asset_id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found', message: 'Asset not found' }, { status: 404 });
    }

    // Guard: prevent delete if asset is referenced by any collection
    try {
      const links = await prisma.collectionAsset.findMany({
        where: { asset_id },
        select: { collection_id: true },
      });
      if (Array.isArray(links) && links.length > 0) {
        return NextResponse.json(
          {
            error: 'Conflict',
            message: 'Asset is referenced by collections and cannot be deleted',
            referenced_by: links.map((l) => l.collection_id),
            count: links.length,
          },
          { status: 409 }
        );
      }
    } catch (e) {
      // Fail closed: if we cannot verify references, avoid destructive delete
      console.error('Error checking asset references before delete:', e);
      return NextResponse.json({ error: 'Precondition Failed', message: 'Unable to verify references' }, { status: 412 });
    }

    await prisma.asset.delete({ where: { id: asset_id } });
    try {
      await invalidateCache([CACHE_TAGS.ASSETS, `${CACHE_TAGS.ASSETS}:${asset_id}`]);
    } catch {}
    await logAudit({ who: 'system', action: 'delete', entity: `asset/${asset_id}` });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ asset_id: string }> }
) {
  try {
  const { asset_id } = await params;
  const body = await parseRequestJsonSafe(request, {} as any);

    const data: any = {};
    if (body.alt !== undefined) data.alt = body.alt;
    if (body.caption !== undefined) data.caption = body.caption;
    if (body.width !== undefined) data.width = parseInt(body.width.toString());
    if (body.height !== undefined) data.height = parseInt(body.height.toString());
    if (body.metadata_json !== undefined) {
      data.metadata_json = typeof body.metadata_json === 'string'
        ? body.metadata_json
        : JSON.stringify(body.metadata_json);
    }

    const updated = await prisma.asset.update({ where: { id: asset_id }, data });
    try {
      await invalidateCache([CACHE_TAGS.ASSETS, `${CACHE_TAGS.ASSETS}:${asset_id}`]);
    } catch {}
    await logAudit({ who: 'system', action: 'edit', entity: `asset/${asset_id}`, payload: data });

    // Return metadata_json parsed
    const response: any = { ...updated };
    if (response.metadata_json && typeof response.metadata_json === 'string') {
      try { response.metadata_json = JSON.parse(response.metadata_json); } catch {}
    }

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Not found', message: 'Asset not found' }, { status: 404 });
    }
    console.error('Error updating asset:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
