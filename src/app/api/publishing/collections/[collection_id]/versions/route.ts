/**
 * Collection Version History API
 * 
 * GET /api/publishing/collections/{id}/versions
 * Retrieves version history for a collection
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const paramsSchema = z.object({
  collection_id: z.string().uuid('Invalid collection ID format')
});

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0)
});

interface VersionHistoryEntry {
  id: string;
  version: number;
  action: 'publish' | 'unpublish' | 'update';
  note: string | null;
  published_at: string;
  snapshot_summary: {
    title: string;
    asset_count: number;
    seo_configured: boolean;
  };
}

interface VersionHistoryResponse {
  collection_id: string;
  current_version: number;
  current_status: 'draft' | 'published';
  total_versions: number;
  versions: VersionHistoryEntry[];
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string }> }
) {
  try {
    // Validate parameters - await params in Next.js 15
    const { collection_id } = paramsSchema.parse(await params);
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const { limit, offset } = querySchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset')
    });

    // Get collection
    const collection = await prisma.collection.findUnique({
      where: { id: collection_id },
      select: {
        id: true,
        title: true,
        version: true,
        status: true
      }
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Get total count of version history entries
    const totalCount = await prisma.publishHistory.count({
      where: { collection_id }
    });

    // Get version history with pagination
    const history = await prisma.publishHistory.findMany({
      where: { collection_id },
      orderBy: [
        { version: 'desc' },
        { published_at: 'desc' }
      ],
      skip: offset,
      take: limit,
      select: {
        id: true,
        version: true,
        action: true,
        note: true,
        published_at: true,
        snapshot_data: true
      }
    });

    // Process history entries
    const versions: VersionHistoryEntry[] = history.map(entry => {
      let snapshotSummary = {
        title: collection.title,
        asset_count: 0,
        seo_configured: false
      };

      try {
        const snapshot = JSON.parse(entry.snapshot_data);
        if (snapshot.collection) {
          snapshotSummary = {
            title: snapshot.collection.title || collection.title,
            asset_count: snapshot.assets ? snapshot.assets.length : 0,
            seo_configured: !!(
              snapshot.collection.seo_title || 
              snapshot.collection.seo_description
            )
          };
        }
      } catch (error) {
        // If snapshot parsing fails, use defaults
        console.warn('Failed to parse snapshot data:', error);
      }

      return {
        id: entry.id,
        version: entry.version,
        action: entry.action as 'publish' | 'unpublish' | 'update',
        note: entry.note,
        published_at: entry.published_at.toISOString(),
        snapshot_summary: snapshotSummary
      };
    });

    const response: VersionHistoryResponse = {
      collection_id,
      current_version: collection.version,
      current_status: collection.status,
      total_versions: totalCount,
      versions,
      pagination: {
        limit,
        offset,
        has_more: offset + limit < totalCount
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching version history:', error);
    
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