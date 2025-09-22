import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string; asset_id: string }> }
) {
  try {
    const { collection_id, asset_id } = await params;

    // Validate collection_id UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(collection_id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Collection ID must be a valid UUID' },
        { status: 400 }
      );
    }

    // Ensure collection exists
    const collection = await prisma.collection.findUnique({ where: { id: collection_id } });
    if (!collection) {
      return NextResponse.json(
        { error: 'Not found', message: 'Collection not found' },
        { status: 404 }
      );
    }

    // Check relation exists
    const existing = await prisma.collectionAsset.findUnique({
      where: { collection_id_asset_id: { collection_id, asset_id } },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Not found', message: 'Asset not linked to this collection' },
        { status: 404 }
      );
    }

    // Delete relation
    await prisma.collectionAsset.delete({
      where: { collection_id_asset_id: { collection_id, asset_id } },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error unlinking asset from collection:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to unlink asset' },
      { status: 500 }
    );
  }
}
