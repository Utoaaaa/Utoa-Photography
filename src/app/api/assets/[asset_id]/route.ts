import { NextRequest, NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { parseRequestJsonSafe } from '@/lib/utils';
import { invalidateCache, CACHE_TAGS } from '@/lib/cache';
import { LOCATION_UUID_REGEX } from '@/lib/prisma/location-service';

async function resolveLocationFolder(locationId: unknown) {
  if (locationId === undefined) {
    return { locationFolderId: undefined as string | null | undefined, error: null as NextResponse | null };
  }
  if (locationId === null || locationId === '') {
    return { locationFolderId: null, error: null };
  }
  if (typeof locationId !== 'string') {
    return {
      locationFolderId: null,
      error: NextResponse.json(
        { error: 'invalid location', message: 'location_id must be a string or null' },
        { status: 400 },
      ),
    };
  }
  if (!LOCATION_UUID_REGEX.test(locationId)) {
    return {
      locationFolderId: null,
      error: NextResponse.json(
        { error: 'invalid location', message: 'location_id must be a valid UUID' },
        { status: 400 },
      ),
    };
  }
  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) {
    return {
      locationFolderId: null,
      error: NextResponse.json(
        { error: 'invalid location', message: 'Location not found' },
        { status: 400 },
      ),
    };
  }
  return { locationFolderId: location.id, error: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ asset_id: string }> }
) {
  try {
    const { asset_id } = await params;
    const asset = await prisma.asset.findUnique({
      where: { id: asset_id },
      include: { locationFolder: { include: { year: true } } } as any,
    });
    if (!asset) {
      return NextResponse.json({ error: 'Not found', message: 'Asset not found' }, { status: 404 });
    }

    const response: Record<string, any> = { ...asset };
    if (response.metadata_json && typeof response.metadata_json === 'string') {
      try { response.metadata_json = JSON.parse(response.metadata_json); } catch {}
    }
    const assetWithFolder = asset as Record<string, any>;
    response.location_folder_id = assetWithFolder.location_folder_id ?? null;
    if (assetWithFolder.locationFolder) {
      response.location_folder_name = assetWithFolder.locationFolder.name;
      response.location_folder_year_id = assetWithFolder.locationFolder.year_id;
      if (assetWithFolder.locationFolder.year?.label) {
        response.location_folder_year_label = assetWithFolder.locationFolder.year.label;
      }
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
    if (body.location_id !== undefined || body.location_folder_id !== undefined) {
      const { locationFolderId, error } = await resolveLocationFolder(body.location_id ?? body.location_folder_id);
      if (error) return error;
      data.location_folder_id = locationFolderId ?? null;
    }

    const updated = await prisma.asset.update({ where: { id: asset_id }, data: data as any, include: { locationFolder: { include: { year: true } } } as any });
    try {
      await invalidateCache([CACHE_TAGS.ASSETS, `${CACHE_TAGS.ASSETS}:${asset_id}`]);
    } catch {}
    await logAudit({ who: 'system', action: 'edit', entity: `asset/${asset_id}`, payload: data });

    // Return metadata_json parsed
    const response: Record<string, any> = { ...updated };
    if (response.metadata_json && typeof response.metadata_json === 'string') {
      try { response.metadata_json = JSON.parse(response.metadata_json); } catch {}
    }
    response.location_folder_id = (updated as Record<string, any>).location_folder_id ?? null;
    const updatedWithFolder = updated as Record<string, any>;
    if (updatedWithFolder.locationFolder) {
      response.location_folder_name = updatedWithFolder.locationFolder.name;
      response.location_folder_year_id = updatedWithFolder.locationFolder.year_id;
      if (updatedWithFolder.locationFolder.year?.label) {
        response.location_folder_year_label = updatedWithFolder.locationFolder.year.label;
      }
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
