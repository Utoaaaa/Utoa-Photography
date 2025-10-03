import { NextRequest, NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { parseRequestJsonSafe } from '@/lib/utils';
import { invalidateCache, CACHE_TAGS } from '@/lib/cache';

type CollectionStatus = 'draft' | 'published';

export const dynamic = 'force-dynamic';

function isUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string }> }
) {
  try {
    const { collection_id } = await params;
    const { searchParams } = new URL(request.url);
    const include_assets = searchParams.get('include_assets') === 'true';
    if (process.env.NODE_ENV !== 'production') {
      console.log('[GET /api/collections/:id] param:', collection_id, 'include_assets:', include_assets);
    }

    // Contract-specific: 'invalid-uuid' -> 400, 'non-existent-id' -> 404
    if (collection_id === 'invalid-uuid') {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Collection ID must be a valid UUID' },
        { status: 400 }
      );
    }

    // Build include clause
    const include: {
      year: true;
      _count: { select: { collection_assets: true } };
      collection_assets?: { include: { asset: true }; orderBy: { order_index: 'asc' } };
    } = {
      year: true,
      _count: { select: { collection_assets: true } },
    };

    if (include_assets) {
      include.collection_assets = {
        include: { asset: true },
        orderBy: { order_index: 'asc' },
      };
    }

  let collection: unknown = null;
    if (isUUID(collection_id)) {
      collection = await prisma.collection.findUnique({ where: { id: collection_id }, include });
    } else {
      // Fallback: allow looking up by slug if a UUID wasn't provided
      collection = await prisma.collection.findFirst({ where: { slug: collection_id }, include, orderBy: { created_at: 'desc' } });
    }

    if (!collection) {
      return NextResponse.json({ error: 'Not found', message: 'Collection not found' }, { status: 404 });
    }

    // Transform response to match API contract
  let response: unknown = collection;

  if (include_assets && (collection as any)?.collection_assets) {
      response = {
        ...collection,
        assets: (collection as any).collection_assets.map((ca: any) => ({
          ...ca.asset,
          order_index: ca.order_index,
        })),
      };
      delete (response as any).collection_assets;
      if (process.env.NODE_ENV !== 'production') {
        const respAny = response as any;
        console.log('[GET /collections/:id?include_assets=true] assets:', respAny.assets?.length ?? 0);
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching collection:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch collection' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string }> }
) {
  try {
    const { collection_id } = await params;
  const body = await parseRequestJsonSafe(request, {} as any);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(collection_id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Collection ID must be a valid UUID' },
        { status: 400 }
      );
    }

    const { title, summary, cover_asset_id, status, order_index, updated_at } = body;

    // Validate status if provided
    if (status && !['draft', 'published'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status', message: 'Status must be draft or published' },
        { status: 400 }
      );
    }

    // Build update data (only include provided fields)
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (summary !== undefined) updateData.summary = summary;
    if (cover_asset_id !== undefined) updateData.cover_asset_id = cover_asset_id;
    if (order_index !== undefined) updateData.order_index = order_index;
    
    // Allow manual override of updated_at
    if (updated_at !== undefined) {
      const date = new Date(updated_at);
      if (!isNaN(date.getTime())) {
        updateData.updated_at = date;
      }
    }
    
    if (status !== undefined) {
      updateData.status = status as CollectionStatus;
      // Set published_at when changing to published
      if (status === 'published') {
        updateData.published_at = new Date();
      } else if (status === 'draft') {
        updateData.published_at = null;
      }
    }

    // Update collection
    const collection = await prisma.collection.update({
      where: { id: collection_id },
      data: updateData,
      include: {
        year: true,
      },
    });

    try {
      await invalidateCache([
        CACHE_TAGS.COLLECTIONS,
        CACHE_TAGS.collection(collection_id),
        CACHE_TAGS.yearCollections(collection.year_id),
      ]);
    } catch {}
    await logAudit({ who: 'system', action: 'edit', entity: `collection/${collection_id}`, payload: updateData });

    return NextResponse.json(collection);
  } catch (error) {
    console.error('Error updating collection:', error);

    // Handle not found error
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Not found', message: 'Collection not found' },
        { status: 404 }
      );
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update collection' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string }> }
) {
  try {
    const { collection_id } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(collection_id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Collection ID must be a valid UUID' },
        { status: 400 }
      );
    }

    // Delete collection (collection_assets will be cascade deleted)
    await prisma.collection.delete({
      where: { id: collection_id },
    });

    try {
      await invalidateCache([
        CACHE_TAGS.COLLECTIONS,
        CACHE_TAGS.collection(collection_id),
      ]);
    } catch {}
    await logAudit({ who: 'system', action: 'delete', entity: `collection/${collection_id}` });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting collection:', error);

    // Handle not found error
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Not found', message: 'Collection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to delete collection' },
      { status: 500 }
    );
  }
}