import { NextRequest, NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { validateData, ValidationRules } from '@/lib/validation';
import { z } from 'zod';

// SEO update schema
const seoSchema = z.object({
  title: z.string().min(1, 'SEO title is required').max(60),
  description: z.string().min(1, 'SEO description is required').max(160),
  ogImageAssetId: z.string().nullable().optional()
});

// GET /api/publishing/collections/{id} - Get collection detail for preview (T021)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string }> }
) {
  try {
    const { collection_id: collectionId } = await params;
    
    // Validate collection ID
    validateData({ collection_id: collectionId }, [
      ValidationRules.uuid('collection_id')
    ]);

    // Fetch collection with all related data for preview
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        year: {
          select: { label: true, id: true }
        },
        collection_assets: {
          include: {
            asset: true // Get all asset fields
          },
          orderBy: { order_index: 'asc' }
        }
      }
    }) as any; // Type assertion to avoid TS issues

    if (!collection) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Collection not found' 
        },
        { status: 404 }
      );
    }

    const collectionData = collection as any;

    // Transform to CollectionDetail format
    const slides = collection.collection_assets.map((ca: any, index: number) => ({
      assetId: ca.asset.id,
      url: `https://imagedelivery.net/${process.env.CLOUDFLARE_ACCOUNT_HASH}/${ca.asset.id}/public`, // Cloudflare Images URL
      alt: ca.asset.alt,
      text: ca.asset.caption || ca.asset.description || null,
      slide_index: index, // Use array index for consistent ordering
      // Additional metadata for the preview
      title: ca.asset.title,
      dimensions: {
        width: ca.asset.width,
        height: ca.asset.height
      }
    }));

    const detail = {
      id: collection.id,
      title: collection.title,
      slug: collection.slug,
      status: collection.status,
      version: collectionData.version,
      publishedAt: collectionData.published_at,
      lastPublishedAt: collectionData.last_published_at,
      year: {
        id: collection.year.id,
        label: collection.year.label
      },
      seo: {
        title: collectionData.seo_title,
        description: collectionData.seo_description,
        ogImageAssetId: collectionData.og_image_asset_id || null
      },
      slides,
      // Metadata for the admin interface
      meta: {
        totalSlides: slides.length,
        createdAt: collection.created_at,
        updatedAt: collection.updated_at
      }
    };

    return NextResponse.json({
      success: true,
      data: detail
    });

  } catch (error) {
    console.error('Error fetching collection detail:', error);
    
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid collection ID format' 
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

// PUT /api/publishing/collections/{id}/seo - Set SEO/OG for collection (T023)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string }> }
) {
  try {
    const { collection_id: collectionId } = await params;
    
    // Validate collection ID
    validateData({ collection_id: collectionId }, [
      ValidationRules.uuid('collection_id')
    ]);

    // Parse request body
    const body = await request.json();
    const validatedData = seoSchema.parse(body);

    // Check if collection exists
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId }
    }) as any;

    if (!collection) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Collection not found' 
        },
        { status: 404 }
      );
    }

    // Validate OG image if provided
    if (validatedData.ogImageAssetId) {
      const ogAsset = await prisma.asset.findUnique({
        where: { id: validatedData.ogImageAssetId }
      });

      if (!ogAsset) {
        return NextResponse.json(
          { 
            success: false,
            error: 'OG image asset not found' 
          },
          { status: 400 }
        );
      }
    }

    // Store previous values for audit
    const previousSeo = {
      title: collection.seo_title,
      description: collection.seo_description
    };

    // Update collection SEO data
    const updatedCollection = await prisma.collection.update({
      where: { id: collectionId },
      data: {
        seo_title: validatedData.title,
        seo_description: validatedData.description,
        updated_at: new Date()
      } as any // Type assertion for schema fields
    });

    // Handle OG image through SEOMetadata table
    if (validatedData.ogImageAssetId !== undefined) {
      // @ts-ignore - Type issues with Prisma client
      await prisma.sEOMetadata.upsert({
        where: {
          entity_type_entity_id: {
            entity_type: 'collection',
            entity_id: collectionId
          }
        },
        update: {
          og_asset_id: validatedData.ogImageAssetId,
          updated_at: new Date()
        },
        create: {
          entity_type: 'collection',
          entity_id: collectionId,
          title: validatedData.title,
          description: validatedData.description,
          og_asset_id: validatedData.ogImageAssetId
        }
      });
    }

    // Log the audit trail
    await logAudit({
      who: 'admin', // TODO: Get from auth context
      action: 'edit',
      entity: `collection/${collectionId}/seo`,
      payload: validatedData,
      metadata: {
        previousSeo,
        collectionTitle: collection.title
      }
    });

    return NextResponse.json({
      success: true,
      message: 'SEO data updated successfully',
      data: {
        collectionId,
        seo: {
          title: validatedData.title,
          description: validatedData.description,
          ogImageAssetId: validatedData.ogImageAssetId
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid SEO data',
          details: error.issues 
        },
        { status: 400 }
      );
    }

    console.error('Error updating SEO data:', error);
    
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid collection ID' 
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