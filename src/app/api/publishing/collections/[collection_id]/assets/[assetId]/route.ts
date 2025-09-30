import { NextRequest, NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { validateData, ValidationRules } from '@/lib/validation';
import { z } from 'zod';
import { parseRequestJsonSafe } from '@/lib/utils';

// Request body schema for asset updates
const updateAssetSchema = z.object({
  text: z.string().nullable().optional(), // Note: This field needs CollectionAsset schema update
  alt: z.string().min(1, 'Alt text is required').max(200).optional(),
  slide_index: z.number().int().min(0).optional()
});

// PATCH /api/publishing/collections/{id}/assets/{assetId} - Update asset fields (T022)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string; assetId: string }> }
) {
  try {
    const { collection_id, assetId } = await params;
    
    // Validate parameters
    validateData({ collection_id, assetId }, [
      ValidationRules.uuid('collection_id'),
      ValidationRules.string('assetId', true, 1, 100)
    ]);

    // Parse request body
  const body = await parseRequestJsonSafe(request, {} as any);
    const validatedData = updateAssetSchema.parse(body);

    // Check if collection exists and asset is part of it
    const collectionAsset = await prisma.collectionAsset.findUnique({
      where: {
        collection_id_asset_id: {
          collection_id,
          asset_id: assetId
        }
      },
      include: {
        asset: true,
        collection: true
      }
    }) as any;

    if (!collectionAsset) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Asset not found in this collection' 
        },
        { status: 404 }
      );
    }

    // Prepare updates
    const updates: { asset?: any; collectionAsset?: any } = {};

    // Update asset alt text if provided
    if (validatedData.alt !== undefined) {
      updates.asset = { alt: validatedData.alt };
    }

    // Update slide index (order_index) if provided
    if (validatedData.slide_index !== undefined) {
      // Convert slide_index to order_index string format
      const orderIndex = validatedData.slide_index.toString().padStart(4, '0');
      updates.collectionAsset = { order_index: orderIndex };
    }

    // Note: text field update would require schema modification (T016)
    // For now, we can store it in the asset's caption field as a workaround
    if (validatedData.text !== undefined) {
      if (!updates.asset) updates.asset = {};
      updates.asset.caption = validatedData.text;
    }

    // Perform updates in transaction
    await prisma.$transaction(async (tx) => {
      // Update asset if needed
      if (updates.asset) {
        await tx.asset.update({
          where: { id: assetId },
          data: updates.asset
        });
      }

      // Update collection asset if needed
      if (updates.collectionAsset) {
        await tx.collectionAsset.update({
          where: {
            collection_id_asset_id: {
              collection_id,
              asset_id: assetId
            }
          },
          data: updates.collectionAsset
        });
      }

      // Update collection's updated_at timestamp
      await tx.collection.update({
        where: { id: collection_id },
        data: { updated_at: new Date() }
      });
    });

    // Log the audit trail
    await logAudit({
      who: 'admin', // TODO: Get from auth context
      action: 'edit',
      entity: `collection/${collection_id}/asset/${assetId}`,
      payload: validatedData,
      metadata: {
        previousAlt: collectionAsset.asset.alt,
        previousOrderIndex: collectionAsset.order_index
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Asset updated successfully',
      data: {
        assetId,
        collectionId: collection_id,
        updates: validatedData
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request data',
          details: error.issues 
        },
        { status: 400 }
      );
    }

    console.error('Error updating asset:', error);
    
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid parameters' 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}