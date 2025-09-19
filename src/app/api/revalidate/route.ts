import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { z } from 'zod';

const revalidateSchema = z.object({
  tags: z.array(z.string()).optional(),
  paths: z.array(z.string()).optional()
}).refine(
  (data) => data.tags?.length || data.paths?.length,
  {
    message: "Either 'tags' or 'paths' must be provided"
  }
);

// POST /api/revalidate - Revalidate cache by tags or paths
export async function POST(request: NextRequest) {
  try {
    // Basic authorization check (in production, use proper auth)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.REVALIDATE_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = revalidateSchema.parse(body);

    const results = {
      revalidated_tags: [] as string[],
      revalidated_paths: [] as string[],
      errors: [] as string[]
    };

    // Revalidate by tags
    if (validatedData.tags) {
      for (const tag of validatedData.tags) {
        try {
          revalidateTag(tag);
          results.revalidated_tags.push(tag);
        } catch (error) {
          console.error(`Error revalidating tag ${tag}:`, error);
          results.errors.push(`Failed to revalidate tag: ${tag}`);
        }
      }
    }

    // Revalidate by paths
    if (validatedData.paths) {
      for (const path of validatedData.paths) {
        try {
          revalidatePath(path);
          results.revalidated_paths.push(path);
        } catch (error) {
          console.error(`Error revalidating path ${path}:`, error);
          results.errors.push(`Failed to revalidate path: ${path}`);
        }
      }
    }

    const hasErrors = results.errors.length > 0;
    const status = hasErrors ? 207 : 200; // 207 Multi-Status for partial success

    return NextResponse.json({
      success: !hasErrors || (results.revalidated_tags.length > 0 || results.revalidated_paths.length > 0),
      message: hasErrors 
        ? 'Partial revalidation completed with errors'
        : 'Revalidation completed successfully',
      data: results,
      timestamp: new Date().toISOString()
    }, { status });

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

    console.error('Error during revalidation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Example usage patterns for cache tags:
/*
Cache Tag Strategy:
- years: All year-related data
- collections: All collection-related data  
- assets: All asset-related data
- years:published: Only published years
- collections:year:{year_id}: Collections for specific year
- collections:{collection_id}: Specific collection
- assets:{asset_id}: Specific asset
- homepage: Homepage cache
- sitemap: Sitemap cache

Example requests:
POST /api/revalidate
{
  "tags": ["years", "homepage"]
}

POST /api/revalidate  
{
  "paths": ["/", "/2024", "/2024/street-photography"]
}

POST /api/revalidate
{
  "tags": ["collections:year:123"],
  "paths": ["/2024"]
}
*/