import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const addAssetSchema = z.object({
  asset_id: z.string().uuid(),
  order_index: z.number().int().min(1).optional()
});

// POST /api/collections/[collection_id]/assets - Add asset to collection
export async function POST(
  request: NextRequest,
  { params }: { params: { collection_id: string } }
) {
  try {
    // Validate collection_id UUID format
    const collectionIdSchema = z.string().uuid();
    const validationResult = collectionIdSchema.safeParse(params.collection_id);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid collection ID format',
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = addAssetSchema.parse(body);

    // Check if collection exists
    const collection = await prisma.collection.findUnique({
      where: { id: params.collection_id },
      include: {
        collection_assets: {
          orderBy: { order_index: 'asc' }
        }
      }
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Check if asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: validatedData.asset_id }
    });

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Check if asset is already in collection
    const existingRelation = await prisma.collectionAsset.findUnique({
      where: {
        collection_id_asset_id: {
          collection_id: params.collection_id,
          asset_id: validatedData.asset_id
        }
      }
    });

    if (existingRelation) {
      return NextResponse.json(
        { error: 'Asset is already in this collection' },
        { status: 409 }
      );
    }

    // Calculate order_index if not provided
    let orderIndex = validatedData.order_index;
    if (!orderIndex) {
      const maxOrder = collection.collection_assets.length > 0 
        ? Math.max(...collection.collection_assets.map((ca: any) => ca.order_index))
        : 0;
      orderIndex = maxOrder + 1;
    } else {
      // Check if order_index is already taken
      const existingOrder = collection.collection_assets.find(
        (ca: any) => ca.order_index === orderIndex
      );
      if (existingOrder) {
        return NextResponse.json(
          { error: `Order index ${orderIndex} is already taken` },
          { status: 409 }
        );
      }
    }

    // Create the collection-asset relationship
    const collectionAsset = await prisma.collectionAsset.create({
      data: {
        collection_id: params.collection_id,
        asset_id: validatedData.asset_id,
        order_index: orderIndex
      },
      include: {
        asset: true,
        collection: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        collection_id: collectionAsset.collection_id,
        asset_id: collectionAsset.asset_id,
        order_index: collectionAsset.order_index,
        asset: {
          id: collectionAsset.asset.id,
          cloudflare_id: collectionAsset.asset.cloudflare_id,
          alt_text: collectionAsset.asset.alt_text,
          caption: collectionAsset.asset.caption,
          metadata: collectionAsset.asset.metadata,
          width: collectionAsset.asset.width,
          height: collectionAsset.asset.height,
          created_at: collectionAsset.asset.created_at
        },
        collection: collectionAsset.collection
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.issues 
        },
        { status: 400 }
      );
    }

    console.error('Error adding asset to collection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}