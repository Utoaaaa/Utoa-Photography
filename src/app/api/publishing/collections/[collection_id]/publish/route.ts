/**
 * Collection Publishing API
 * 
 * POST /api/publishing/collections/{id}/publish
 * Publishes a collection after validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma, logAudit } from '@/lib/db';
import { revalidateTag } from 'next/cache';

const paramsSchema = z.object({
  collection_id: z.string().uuid('Invalid collection ID format')
});

const publishSchema = z.object({
  note: z.string().optional(),
  force: z.boolean().default(false) // Skip validation warnings if true
});

interface PublishResponse {
  collection_id: string;
  status: 'published';
  version: number;
  published_at: string;
  cache_invalidated: string[];
  message: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string }> }
) {
  try {
    // Validate parameters - await params in Next.js 15
    const { collection_id } = paramsSchema.parse(await params);
    const body = await request.json();
    const { note, force } = publishSchema.parse(body);

    // Get collection with related data
    const collection = await prisma.collection.findUnique({
      where: { id: collection_id },
      include: {
        collection_assets: {
          include: {
            asset: true
          },
          orderBy: {
            order_index: 'asc'
          }
        },
        year: true
      }
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Validate publishing requirements (unless forced)
    if (!force) {
      const validationErrors: string[] = [];

      // Check required fields
      if (!collection.title.trim()) {
        validationErrors.push('Collection title is required');
      }

      if (collection.collection_assets.length === 0) {
        validationErrors.push('Collection must contain at least one image');
      }

      // Check all assets have alt text
      const assetsWithoutAlt = collection.collection_assets.filter(
        ca => !ca.asset.alt || ca.asset.alt.trim() === ''
      );
      
      if (assetsWithoutAlt.length > 0) {
        validationErrors.push(`${assetsWithoutAlt.length} image(s) missing alt text`);
      }

      if (validationErrors.length > 0) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validationErrors,
            message: 'Collection cannot be published due to validation errors. Use force=true to override warnings only.'
          },
          { status: 400 }
        );
      }
    }

    // Create snapshot of current collection state
    const snapshot = {
      collection: {
        id: collection.id,
        title: collection.title,
        summary: collection.summary,
        seo_title: collection.seo_title,
        seo_description: collection.seo_description,
        seo_keywords: collection.seo_keywords,
        cover_asset_id: collection.cover_asset_id,
        status: collection.status,
        order_index: collection.order_index
      },
      assets: collection.collection_assets.map(ca => ({
        asset_id: ca.asset_id,
        order_index: ca.order_index,
        asset: {
          id: ca.asset.id,
          alt: ca.asset.alt,
          caption: ca.asset.caption,
          description: ca.asset.description,
          title: ca.asset.title,
          photographer: ca.asset.photographer,
          location: ca.asset.location,
          tags: ca.asset.tags,
          width: ca.asset.width,
          height: ca.asset.height
        }
      })),
      year: {
        id: collection.year.id,
        label: collection.year.label,
        status: collection.year.status
      },
      published_at: new Date().toISOString()
    };

    // Start transaction to update collection and create history
    const result = await prisma.$transaction(async (tx) => {
      // Increment version and update collection
      const newVersion = collection.version + 1;
      const now = new Date();
      
      const updatedCollection = await tx.collection.update({
        where: { id: collection_id },
        data: {
          status: 'published',
          version: newVersion,
          published_at: collection.published_at || now, // Keep original publish date
          last_published_at: now
        }
      });

      // Create publish history record
      await tx.publishHistory.create({
        data: {
          collection_id,
          version: newVersion,
          action: 'publish',
          note: note || null,
          published_at: now,
          snapshot_data: JSON.stringify(snapshot)
        }
      });

      return updatedCollection;
    });

    // Log audit trail (T024 integration with T019)
    await logAudit({
      who: 'admin', // TODO: Get from auth context
      action: 'publish',
      entity: `collection/${collection_id}`,
      payload: { note, version: (result as any).version },
      metadata: {
        previousStatus: collection.status,
        collectionTitle: collection.title,
        assetCount: collection.collection_assets.length
      }
    });

    // Use precise cache invalidation (T024 integration with T018)
    try {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REVALIDATE_SECRET}`
        },
        body: JSON.stringify({
          targets: {
            home: true,
            year: collection.year_id,
            collection: collection_id
          }
        })
      });
    } catch (cacheError) {
      console.error('Cache invalidation failed:', cacheError);
      // Don't fail the publish for cache issues
    }

    // Fallback manual cache invalidation
    const cacheTags = [
      'collections',
      `collection:${collection_id}`,
      `year:${collection.year_id}`,
      'homepage'
    ];

    for (const tag of cacheTags) {
      revalidateTag(tag);
    }

    const response: PublishResponse = {
      collection_id,
      status: 'published',
      version: (result as any).version,
      published_at: (result as any).last_published_at!.toISOString(),
      cache_invalidated: cacheTags,
      message: `Collection "${collection.title}" published successfully`
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error publishing collection:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}