import { NextRequest, NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/auth';
import { parseRequestJsonSafe, writeAudit } from '@/lib/utils';
import { invalidateCache, CACHE_TAGS } from '@/lib/cache';
import { LOCATION_UUID_REGEX } from '@/lib/location-service-shared';
import {
  shouldUseD1Direct,
  d1GetAssets,
  d1CreateAsset,
  d1AssetExists,
  d1CreateAuditLog,
} from '@/lib/d1-queries';
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
  const location = await prisma.location.findUnique({ where: { id: locationId }, select: { id: true } });
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

export async function POST(request: NextRequest) {
  try {
    // Require Cloudflare Access (admin only)
    requireAdminAuth(request);
    // TODO: Add authentication check
    // const auth = request.headers.get('authorization');
    // if (!auth || !auth.startsWith('Bearer ')) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized', message: 'Authentication required' },
    //     { status: 401 }
    //   );
    // }

    const useD1 = shouldUseD1Direct();

    const body = await parseRequestJsonSafe(request, {} as any);
    const {
      id,
      alt,
      caption,
      width,
      height,
      metadata_json,
      location_id: requestedLocationId,
      location_folder_id: requestedLocationFolderId,
    } = body;

    // Validate required fields
    if (!id || !alt || !width || !height) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'ID, alt, width, and height are required' },
        { status: 400 }
      );
    }

    // Validate alt text length
    if (alt.length === 0 || alt.length > 200) {
      return NextResponse.json(
        { error: 'invalid alt', message: 'alt must be between 1 and 200 characters' },
        { status: 400 }
      );
    }

    // Validate caption length if provided
    if (caption && caption.length > 1000) {
      return NextResponse.json(
        { error: 'invalid caption', message: 'caption must be 1000 characters or less' },
        { status: 400 }
      );
    }

    // Validate dimensions with reasonable bounds (used by E2E tests)
    const minW = 200; const minH = 200; // minimum dimensions
    const maxW = 12000; const maxH = 12000; // maximum dimensions (allow larger originals)
    if (width <= 0 || height <= 0) {
      return NextResponse.json(
        { error: 'invalid dimensions', message: 'width and height must be positive numbers' },
        { status: 400 }
      );
    }
    if (width < minW || height < minH) {
      return NextResponse.json(
        { error: 'invalid dimensions', message: 'Image does not meet minimum dimensions' },
        { status: 400 }
      );
    }
    if (width > maxW || height > maxH) {
      return NextResponse.json(
        { error: 'invalid dimensions', message: 'Image exceeds maximum dimensions' },
        { status: 400 }
      );
    }

    // Check if asset already exists
    let existingAsset;
    if (useD1) {
      existingAsset = await d1AssetExists(id);
    } else {
      const { prisma } = await getNodeDb();
      existingAsset = await prisma.asset.findUnique({ where: { id } });
    }

    if (existingAsset) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Asset with this ID already exists; please verify direct upload status before retrying', id },
        { status: 409 }
      );
    }

    const { locationFolderId, error: locationError } = await resolveLocationFolder(
      requestedLocationId ?? requestedLocationFolderId,
    );
    if (locationError) {
      return locationError;
    }

    // Serialize metadata_json if it's an object
    let serializedMetadata = null;
    if (metadata_json) {
      if (typeof metadata_json === 'object') {
        serializedMetadata = JSON.stringify(metadata_json);
      } else if (typeof metadata_json === 'string') {
        // Validate it's valid JSON
        try {
          JSON.parse(metadata_json);
          serializedMetadata = metadata_json;
        } catch {
          return NextResponse.json(
            { error: 'Invalid metadata', message: 'metadata_json must be valid JSON' },
            { status: 400 }
          );
        }
      }
    }

    // Create new asset - use D1 direct in production
    let asset;
    if (useD1) {
      asset = await d1CreateAsset({
        id,
        alt,
        caption,
        width: parseInt(width.toString()),
        height: parseInt(height.toString()),
        metadata_json: serializedMetadata,
        location_folder_id: locationFolderId,
      });
      // Audit log
      try {
        await d1CreateAuditLog({
          actor: 'system',
          actor_type: 'system',
          entity_type: 'asset',
          entity_id: asset.id,
          action: 'create',
          meta: JSON.stringify({ id: asset.id }),
        });
        await writeAudit({
          timestamp: new Date().toISOString(),
          who: 'system',
          action: 'create',
          entity: `asset/${asset.id}`,
          payload: { id: asset.id },
        });
      } catch (e) {
        console.error('Audit log failed:', e);
      }
    } else {
      const { prisma, logAudit } = await getNodeDb();
      const createData: Record<string, any> = {
        id,
        alt,
        caption,
        width: parseInt(width.toString()),
        height: parseInt(height.toString()),
        metadata_json: serializedMetadata,
      };
      if (locationFolderId !== undefined) {
        createData.location_folder_id = locationFolderId;
      }
      asset = await prisma.asset.create({
        data: createData as any,
      });
      await logAudit({ who: 'system', action: 'create', entity: `asset/${asset.id}`, payload: { id: asset.id } });
    }

    // Return metadata_json parsed back to object if possible
    const response: Record<string, any> = { ...asset };
    if (response.metadata_json && typeof response.metadata_json === 'string') {
      try { response.metadata_json = JSON.parse(response.metadata_json); } catch {}
    }
    const assetWithFolder = asset as Record<string, any>;
    response.location_folder_id = assetWithFolder.location_folder_id ?? null;

    try {
      await invalidateCache([CACHE_TAGS.ASSETS]);
    } catch {}

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating asset:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Asset with this ID already exists; please verify direct upload status before retrying' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create asset' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Require Cloudflare Access (admin only)
    requireAdminAuth(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const locationFilter = searchParams.get('location_id') ?? searchParams.get('location_folder_id');
    const unassigned = searchParams.get('unassigned') === 'true';

    let assets;
    
    if (shouldUseD1Direct()) {
      // Use D1 direct queries in production
      const baseAssets = await d1GetAssets({
        limit: Number.isNaN(limit) ? 50 : limit,
        offset: Number.isNaN(offset) ? 0 : offset,
        location_folder_id: locationFilter || undefined,
        unassigned,
      });
      
      // For D1, we need to manually join location folder and year data
      const db = getD1Database();
      const result = [];
      
      for (const asset of baseAssets) {
        const obj: Record<string, any> = { ...asset };
        
        // Parse metadata_json
        if (obj.metadata_json && typeof obj.metadata_json === 'string') {
          try { obj.metadata_json = JSON.parse(obj.metadata_json); } catch { /* ignore */ }
        }
        
        obj.location_folder_id = asset.location_folder_id ?? null;
        obj.used = false; // Default, would need to query collection_assets
        
        // Get location folder info if exists
        if (asset.location_folder_id && db) {
          const folder = await db.prepare(
            'SELECT id, name, year_id FROM locations WHERE id = ?'
          ).bind(asset.location_folder_id).first() as any;
          
          if (folder) {
            obj.location_folder_name = folder.name;
            obj.location_folder_year_id = folder.year_id;
            
            if (folder.year_id) {
              const year = await db.prepare(
                'SELECT label FROM years WHERE id = ?'
              ).bind(folder.year_id).first() as any;
              
              if (year) {
                obj.location_folder_year_label = year.label;
              }
            }
          }
        }
        
        result.push(obj);
      }
      
      assets = result;
    } else {
      // Use Prisma in development
      const { prisma } = await getNodeDb();
      const where: Record<string, any> = {};
      if (locationFilter) {
        where.location_folder_id = locationFilter;
      } else if (unassigned) {
        where.location_folder_id = null;
      }

      const prismaAssets = await prisma.asset.findMany({
        orderBy: { created_at: 'desc' },
        take: Number.isNaN(limit) ? 50 : limit,
        skip: Number.isNaN(offset) ? 0 : offset,
        where,
        include: {
          _count: { select: { collection_assets: true } },
          locationFolder: { include: { year: true } },
        } as any,
      });

      // Parse metadata_json to objects when possible
      assets = prismaAssets.map((a: any) => {
        const { _count, locationFolder, ...rest } = a;
        const obj: Record<string, any> = { ...rest, used: (_count?.collection_assets ?? 0) > 0 };
        if (obj.metadata_json && typeof obj.metadata_json === 'string') {
          try { obj.metadata_json = JSON.parse(obj.metadata_json); } catch { /* ignore */ }
        }
        obj.location_folder_id = rest.location_folder_id ?? null;
        if (locationFolder) {
          obj.location_folder_name = locationFolder.name;
          obj.location_folder_year_id = locationFolder.year_id;
          if (locationFolder.year?.label) {
            obj.location_folder_year_label = locationFolder.year.label;
          }
        }
        return obj;
      });
    }

    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error listing assets:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to list assets' },
      { status: 500 }
    );
  }
}
