import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type CollectionStatus = 'draft' | 'published';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string }> }
) {
  try {
    const { collection_id } = await params;
    const { searchParams } = new URL(request.url);
    const include_assets = searchParams.get('include_assets') === 'true';

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(collection_id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Collection ID must be a valid UUID' },
        { status: 400 }
      );
    }

    // Build include clause
    const include: any = {
      year: true,
      cover_asset: true,
      _count: {
        select: {
          collection_assets: true,
        },
      },
    };

    if (include_assets) {
      include.collection_assets = {
        include: {
          asset: true,
        },
        orderBy: {
          order_index: 'asc' as const,
        },
      };
    }

    const collection = await prisma.collection.findUnique({
      where: { id: collection_id },
      include,
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Not found', message: 'Collection not found' },
        { status: 404 }
      );
    }

    // Transform response to match API contract
    let response: any = collection;

    if (include_assets && collection.collection_assets) {
      response = {
        ...collection,
        assets: collection.collection_assets.map((ca: any) => ({
          ...ca.asset,
          order_index: ca.order_index,
        })),
      };
      delete response.collection_assets;
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
    const body = await request.json();

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(collection_id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Collection ID must be a valid UUID' },
        { status: 400 }
      );
    }

    const { title, summary, cover_asset_id, status, order_index } = body;

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
        cover_asset: true,
      },
    });

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