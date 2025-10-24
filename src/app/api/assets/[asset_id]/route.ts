import { NextRequest, NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/auth';
import { parseRequestJsonSafe, writeAudit } from '@/lib/utils';
import { invalidateCache, CACHE_TAGS } from '@/lib/cache';
import { LOCATION_UUID_REGEX } from '@/lib/location-service-shared';
import { shouldUseD1Direct, d1CreateAuditLog } from '@/lib/d1-queries';
import { d1FindLocationById } from '@/lib/d1/location-service';
import { getD1Database } from '@/lib/cloudflare';

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
  params: { action: 'create' | 'edit' | 'delete'; assetId: string; payload?: Record<string, unknown> },
) {
  const { action, assetId, payload } = params;
  if (useD1) {
    try {
      await d1CreateAuditLog({
        actor: 'system',
        actor_type: 'system',
        entity_type: 'asset',
        entity_id: assetId,
        action,
        meta: JSON.stringify({ payload }),
      });
    } catch (error) {
      console.error('[asset] failed to persist audit via D1', error);
    }

    try {
      await writeAudit({
        timestamp: new Date().toISOString(),
        who: 'system',
        action,
        entity: `asset/${assetId}`,
        payload,
      });
    } catch (error) {
      console.error('[asset] failed to write audit sink', error);
    }
    return;
  }

  const { logAudit } = await getNodeDb();
  await logAudit({
    who: 'system',
    action,
    entity: `asset/${assetId}`,
    payload,
  });
}

async function resolveLocationFolder(locationId: unknown) {
  const useD1 = shouldUseD1Direct();

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
  if (useD1) {
    const location = await d1FindLocationById(locationId);
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

  const { prisma } = await getNodeDb();
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
    requireAdminAuth(request);
    const { asset_id } = await params;
    const useD1 = shouldUseD1Direct();

    if (useD1) {
      const db = requireD1();
      const row = await db.prepare(
        `
          SELECT
            a.*,
            l.name AS location_name,
            l.year_id AS location_year_id,
            y.label AS location_year_label
          FROM assets a
          LEFT JOIN locations l ON l.id = a.location_folder_id
          LEFT JOIN years y ON y.id = l.year_id
          WHERE a.id = ?1
          LIMIT 1
        `,
      ).bind(asset_id).first() as Record<string, unknown> | null;

      if (!row) {
        return NextResponse.json({ error: 'Not found', message: 'Asset not found' }, { status: 404 });
      }

      const response: Record<string, any> = {
        id: String(row.id),
        alt: String(row.alt),
        caption: row.caption ?? null,
        description: row.description ?? null,
        title: row.title ?? null,
        photographer: row.photographer ?? null,
        location: row.location ?? null,
        tags: row.tags ?? null,
        width: Number(row.width),
        height: Number(row.height),
        metadata_json: row.metadata_json ?? null,
        location_folder_id: row.location_folder_id ?? null,
        created_at: String(row.created_at),
        updated_at: String(row.updated_at),
      };

      if (typeof response.metadata_json === 'string') {
        try { response.metadata_json = JSON.parse(response.metadata_json); } catch {}
      }

      if (row.location_name) {
        response.location_folder_name = row.location_name;
      }
      if (row.location_year_id) {
        response.location_folder_year_id = row.location_year_id;
      }
      if (row.location_year_label) {
        response.location_folder_year_label = row.location_year_label;
      }

      return NextResponse.json(response, { status: 200 });
    }

    const { prisma } = await getNodeDb();
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
    requireAdminAuth(request);
    const { asset_id } = await params;
    const useD1 = shouldUseD1Direct();

    if (useD1) {
      const db = requireD1();

      const existing = await db.prepare(
        'SELECT id FROM assets WHERE id = ?1 LIMIT 1',
      ).bind(asset_id).first();

      if (!existing) {
        return NextResponse.json({ error: 'Not found', message: 'Asset not found' }, { status: 404 });
      }

      try {
        const links = await db.prepare(
          'SELECT collection_id FROM collection_assets WHERE asset_id = ?1 LIMIT 50',
        ).bind(asset_id).all();
        const linkRows = links.results ?? [];
        if (linkRows.length > 0) {
          return NextResponse.json(
            {
              error: 'Conflict',
              message: 'Asset is referenced by collections and cannot be deleted',
              referenced_by: linkRows.map((row: Record<string, unknown>) => String(row.collection_id)),
              count: linkRows.length,
            },
            { status: 409 },
          );
        }
      } catch (error) {
        console.error('Error checking asset references before delete (D1):', error);
        return NextResponse.json(
          { error: 'Precondition Failed', message: 'Unable to verify references' },
          { status: 412 },
        );
      }

      await db.prepare('DELETE FROM assets WHERE id = ?1').bind(asset_id).run();

      try {
        await invalidateCache([CACHE_TAGS.ASSETS, `${CACHE_TAGS.ASSETS}:${asset_id}`]);
      } catch (error) {
        console.error('[asset] cache invalidation failed (D1 path)', error);
      }

      await recordAudit(true, { action: 'delete', assetId: asset_id });

      return new NextResponse(null, { status: 204 });
    }

    const { prisma } = await getNodeDb();

    const existing = await prisma.asset.findUnique({ where: { id: asset_id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found', message: 'Asset not found' }, { status: 404 });
    }

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
          { status: 409 },
        );
      }
    } catch (e) {
      console.error('Error checking asset references before delete:', e);
      return NextResponse.json(
        { error: 'Precondition Failed', message: 'Unable to verify references' },
        { status: 412 },
      );
    }

    await prisma.asset.delete({ where: { id: asset_id } });
    try {
      await invalidateCache([CACHE_TAGS.ASSETS, `${CACHE_TAGS.ASSETS}:${asset_id}`]);
    } catch {}

    await recordAudit(false, { action: 'delete', assetId: asset_id });
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
    requireAdminAuth(request);
    const { asset_id } = await params;
    const body = await parseRequestJsonSafe(request, {} as any);
    const useD1 = shouldUseD1Direct();

    const data: Record<string, unknown> = {};
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

    if (useD1) {
      const db = requireD1();

      const existing = await db.prepare(
        'SELECT * FROM assets WHERE id = ?1 LIMIT 1',
      ).bind(asset_id).first();

      if (!existing) {
        return NextResponse.json({ error: 'Not found', message: 'Asset not found' }, { status: 404 });
      }

      const updates: string[] = [];
      const bindings: unknown[] = [];

      if (data.alt !== undefined) {
        updates.push('alt = ?');
        bindings.push(data.alt);
      }
      if (data.caption !== undefined) {
        updates.push('caption = ?');
        bindings.push(data.caption ?? null);
      }
      if (data.width !== undefined) {
        updates.push('width = ?');
        bindings.push(data.width);
      }
      if (data.height !== undefined) {
        updates.push('height = ?');
        bindings.push(data.height);
      }
      if (data.metadata_json !== undefined) {
        updates.push('metadata_json = ?');
        bindings.push(data.metadata_json ?? null);
      }
      if (Object.prototype.hasOwnProperty.call(data, 'location_folder_id')) {
        updates.push('location_folder_id = ?');
        bindings.push((data.location_folder_id as string | null) ?? null);
      }

      if (updates.length > 0) {
        updates.push('updated_at = ?');
        const now = new Date().toISOString();
        bindings.push(now);
      } else {
        // No changes requested
        updates.push('updated_at = updated_at');
      }

      bindings.push(asset_id);

      await db.prepare(
        `UPDATE assets SET ${updates.join(', ')} WHERE id = ?`,
      ).bind(...bindings).run();

      const updatedRow = await db.prepare(
        `
          SELECT
            a.*,
            l.name AS location_name,
            l.year_id AS location_year_id,
            y.label AS location_year_label
          FROM assets a
          LEFT JOIN locations l ON l.id = a.location_folder_id
          LEFT JOIN years y ON y.id = l.year_id
          WHERE a.id = ?1
          LIMIT 1
        `,
      ).bind(asset_id).first() as Record<string, unknown> | null;

      if (!updatedRow) {
        return NextResponse.json({ error: 'Not found', message: 'Asset not found' }, { status: 404 });
      }

      try {
        await invalidateCache([CACHE_TAGS.ASSETS, `${CACHE_TAGS.ASSETS}:${asset_id}`]);
      } catch (error) {
        console.error('[asset] cache invalidation failed (D1 path)', error);
      }

      await recordAudit(true, { action: 'edit', assetId: asset_id, payload: data });

      const response: Record<string, any> = {
        id: String(updatedRow.id),
        alt: String(updatedRow.alt),
        caption: updatedRow.caption ?? null,
        description: updatedRow.description ?? null,
        title: updatedRow.title ?? null,
        photographer: updatedRow.photographer ?? null,
        location: updatedRow.location ?? null,
        tags: updatedRow.tags ?? null,
        width: Number(updatedRow.width),
        height: Number(updatedRow.height),
        metadata_json: updatedRow.metadata_json ?? null,
        location_folder_id: updatedRow.location_folder_id ?? null,
        created_at: String(updatedRow.created_at),
        updated_at: String(updatedRow.updated_at),
      };

      if (typeof response.metadata_json === 'string') {
        try { response.metadata_json = JSON.parse(response.metadata_json); } catch {}
      }
      if (updatedRow.location_name) {
        response.location_folder_name = updatedRow.location_name;
      }
      if (updatedRow.location_year_id) {
        response.location_folder_year_id = updatedRow.location_year_id;
      }
      if (updatedRow.location_year_label) {
        response.location_folder_year_label = updatedRow.location_year_label;
      }

      return NextResponse.json(response);
    }

    const { prisma, logAudit } = await getNodeDb();

    const updated = await prisma.asset.update({
      where: { id: asset_id },
      data: data as any,
      include: { locationFolder: { include: { year: true } } } as any,
    });
    try {
      await invalidateCache([CACHE_TAGS.ASSETS, `${CACHE_TAGS.ASSETS}:${asset_id}`]);
    } catch {}
    await logAudit({ who: 'system', action: 'edit', entity: `asset/${asset_id}`, payload: data });

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
