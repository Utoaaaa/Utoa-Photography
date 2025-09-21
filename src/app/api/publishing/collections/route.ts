import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateData, ValidationRules } from '@/lib/validation';
import { z } from 'zod';

// Query parameters schema for filtering
const querySchema = z.object({
  year: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
  limit: z.string().transform(val => parseInt(val)).optional(),
  offset: z.string().transform(val => parseInt(val)).optional()
});

// GET /api/publishing/collections - List collections with checklist status (T020)
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryData = {
      year: searchParams.get('year') || undefined,
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined
    };

    const validatedQuery = querySchema.parse(queryData);

    // Build where clause
    const where: any = {};
    
    if (validatedQuery.year) {
      // Find year by ID or label
      const year = await prisma.year.findFirst({
        where: {
          OR: [
            { id: validatedQuery.year },
            { label: validatedQuery.year }
          ]
        }
      });
      
      if (year) {
        where.year_id = year.id;
      }
    }

    if (validatedQuery.status) {
      where.status = validatedQuery.status;
    }

    // Fetch collections with related data
    const collections = await prisma.collection.findMany({
      where,
      include: {
        year: {
          select: { label: true }
        },
        collection_assets: {
          include: {
            asset: {
              select: { alt: true }
            }
          }
        },
        _count: {
          select: { collection_assets: true }
        }
      },
      orderBy: [
        { year: { order_index: 'desc' } },
        { order_index: 'desc' }
      ],
      take: validatedQuery.limit || 50,
      skip: validatedQuery.offset || 0
    });

    // Transform to CollectionSummary format with checklist status
    const summaries = collections.map(collection => {
      // Calculate checklist status
      const collectionData = collection as any;
      const hasTitle = !!collection.title?.trim();
      const hasSeoTitle = !!collectionData.seo_title?.trim();
      const hasSeoDescription = !!collectionData.seo_description?.trim();
      const allAssetsHaveAlt = collection.collection_assets.every(ca => !!ca.asset.alt?.trim());
      
      const checklistStatus = hasTitle && hasSeoTitle && hasSeoDescription && allAssetsHaveAlt 
        ? 'pass' 
        : 'pending';

      return {
        id: collection.id,
        title: collection.title,
        year: parseInt(collection.year.label),
        draftCount: collection._count.collection_assets,
        checklistStatus,
        // Additional useful fields
        slug: collection.slug,
        status: collection.status,
        version: collectionData.version,
        lastPublishedAt: collectionData.last_published_at,
        updatedAt: collection.updated_at
      };
    });

    return NextResponse.json({
      success: true,
      data: summaries,
      meta: {
        total: summaries.length,
        limit: validatedQuery.limit || 50,
        offset: validatedQuery.offset || 0
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid query parameters',
          details: error.issues 
        },
        { status: 400 }
      );
    }

    console.error('Error fetching collections:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}