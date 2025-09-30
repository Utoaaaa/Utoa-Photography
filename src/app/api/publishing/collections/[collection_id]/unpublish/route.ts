/**
 * Collection Unpublishing API
 * 
 * POST /api/publishing/collections/{id}/unpublish
 * Unpublishes a collection and invalidates caches
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma, logAudit } from '@/lib/db';
import { revalidateTag } from 'next/cache';
import { parseRequestJsonSafe } from '@/lib/utils';

const paramsSchema = z.object({
  collection_id: z.string().uuid('Invalid collection ID format')
});

const unpublishSchema = z.object({
  note: z.string().optional()
});

interface UnpublishResponse {
  collection_id: string;
  status: 'draft';
  version: number;
  unpublished_at: string;
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
  const body = await parseRequestJsonSafe(request, {} as any);
    const { note } = unpublishSchema.parse(body);

    // Get collection
    const collection = await prisma.collection.findUnique({
      where: { id: collection_id },
      include: {
        year: true
      }
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    if (collection.status !== 'published') {
      return NextResponse.json(
        { error: 'Collection is not currently published' },
        { status: 400 }
      );
    }

    // Start transaction to update collection and create history
    const result = await prisma.$transaction(async (tx) => {
      // Update collection status
      const updatedCollection = await tx.collection.update({
        where: { id: collection_id },
        data: {
          status: 'draft'
        }
      });

      // Create unpublish history record (version stays the same)
      // @ts-ignore - Type issues with Prisma client
      await tx.publishHistory.create({
        data: {
          collection_id,
          version: (collection as any).version,
          action: 'unpublish',
          note: note || null,
          published_at: new Date(),
          snapshot_data: JSON.stringify({
            action: 'unpublish',
            previous_status: 'published',
            unpublished_at: new Date().toISOString(),
            note: note || null
          })
        }
      });

      return updatedCollection;
    });

    // Log audit trail (T025 integration with T019)
    await logAudit({
      who: 'admin', // TODO: Get from auth context
      action: 'unpublish',
      entity: `collection/${collection_id}`,
      payload: { note },
      metadata: {
        previousStatus: collection.status,
        collectionTitle: collection.title,
        version: (collection as any).version
      }
    });

    // Use precise cache invalidation (T025 integration with T018)
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
      // Don't fail the unpublish for cache issues
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

    const response: UnpublishResponse = {
      collection_id,
      status: 'draft',
      version: (collection as any).version,
      unpublished_at: new Date().toISOString(),
      cache_invalidated: cacheTags,
      message: `Collection "${collection.title}" unpublished successfully`
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error unpublishing collection:', error);
    
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