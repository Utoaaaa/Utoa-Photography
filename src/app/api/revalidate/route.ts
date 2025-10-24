import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { revalidatePathsWithRetry, revalidateTagsWithRetry } from '@/lib/cache';
import { z } from 'zod';
import { parseRequestJsonSafe } from '@/lib/utils';
import { shouldUseD1Direct } from '@/lib/d1-queries';
import { getD1Database } from '@/lib/cloudflare';
import { d1FindYearByIdentifier } from '@/lib/d1/location-service';

type PrismaClient = import('@prisma/client').PrismaClient;

let prismaPromise: Promise<PrismaClient> | null = null;

async function getPrisma() {
  if (!prismaPromise) {
    prismaPromise = import('@/lib/db').then(({ prisma }) => prisma);
  }
  return prismaPromise;
}

function requireD1() {
  const db = getD1Database();
  if (!db) {
    throw new Error('D1 database not available');
  }
  return db;
}

async function getYearById(yearId: string) {
  if (shouldUseD1Direct()) {
    const year = await d1FindYearByIdentifier(yearId);
    if (!year) {
      return null;
    }
    return {
      label: year.label,
    };
  }
  const prisma = await getPrisma();
  return prisma.year.findUnique({
    where: { id: yearId },
    select: { label: true },
  });
}

async function getCollectionWithYear(collectionId: string) {
  if (shouldUseD1Direct()) {
    const db = requireD1();
    const row = await db.prepare(
      `
        SELECT
          c.id,
          c.slug,
          c.year_id,
          y.label AS year_label
        FROM collections c
        JOIN years y ON y.id = c.year_id
        WHERE c.id = ?1
        LIMIT 1
      `,
    ).bind(collectionId).first() as { id: string; slug: string; year_id: string; year_label: string } | null;

    if (!row) {
      return null;
    }

    return {
      slug: row.slug,
      year: {
        label: row.year_label,
      },
    };
  }

  const prisma = await getPrisma();
  return prisma.collection.findUnique({
    where: { id: collectionId },
    include: {
      year: { select: { label: true } },
    },
  });
}

const revalidateSchema = z.object({
  tags: z.array(z.string()).optional(),
  paths: z.array(z.string()).optional(),
  // Precise invalidation targets (T018)
  targets: z.object({
    home: z.boolean().optional(),
    year: z.string().optional(), // year_id
    collection: z.string().optional(), // collection_id
  }).optional()
}).refine(
  (data) => data.tags?.length || data.paths?.length || data.targets,
  {
    message: "Either 'tags', 'paths', or 'targets' must be provided"
  }
);

// Precise invalidation helper (T018)
async function invalidatePreciseTargets(targets: {
  home?: boolean;
  year?: string;
  collection?: string;
}) {
  const invalidatedPaths: string[] = [];
  const invalidatedTags: string[] = [];

  // Home page invalidation
  if (targets.home) {
    revalidatePath('/');
    revalidateTag('homepage');
    invalidatedPaths.push('/');
    invalidatedTags.push('homepage');
  }

  // Year page invalidation
  if (targets.year) {
    try {
      const year = await getYearById(targets.year);

      if (year?.label) {
        const yearPath = `/${year.label}`;
        revalidatePath(yearPath);
        revalidateTag(`years:${targets.year}`);
        revalidateTag(`collections:year:${targets.year}`);
        invalidatedPaths.push(yearPath);
        invalidatedTags.push(`years:${targets.year}`, `collections:year:${targets.year}`);
      }
    } catch (error) {
      console.error('Error invalidating year:', error);
    }
  }

  // Collection page invalidation
  if (targets.collection) {
    try {
      const collection = await getCollectionWithYear(targets.collection);

      if (collection?.year?.label && collection.slug) {
        const collectionPath = `/${collection.year.label}/${collection.slug}`;
        revalidatePath(collectionPath);
        revalidateTag(`collections:${targets.collection}`);
        revalidateTag(`assets:collection:${targets.collection}`);
        invalidatedPaths.push(collectionPath);
        invalidatedTags.push(`collections:${targets.collection}`, `assets:collection:${targets.collection}`);
      }
    } catch (error) {
      console.error('Error invalidating collection:', error);
    }
  }

  return { paths: invalidatedPaths, tags: invalidatedTags };
}

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

  const body = await parseRequestJsonSafe(request, {} as any);
    const validatedData = revalidateSchema.parse(body);

    const results = {
      revalidated_tags: [] as string[],
      revalidated_paths: [] as string[],
      invalidated_targets: [] as string[],
      errors: [] as string[]
    };

    // Revalidate by tags
    if (validatedData.tags) {
      const { success, failed } = await revalidateTagsWithRetry(validatedData.tags, { who: 'system', auditOnFailure: true });
      results.revalidated_tags.push(...success);
      for (const f of failed) {
        console.error(`Error revalidating tag ${f.value}:`, f.error);
        results.errors.push(`Failed to revalidate tag: ${f.value}`);
      }
    }

    // Revalidate by paths
    if (validatedData.paths) {
      const { success, failed } = await revalidatePathsWithRetry(validatedData.paths, { who: 'system', auditOnFailure: true });
      results.revalidated_paths.push(...success);
      for (const f of failed) {
        console.error(`Error revalidating path ${f.value}:`, f.error);
        results.errors.push(`Failed to revalidate path: ${f.value}`);
      }
    }

    // Precise invalidation targets (T018)
    if (validatedData.targets) {
      try {
        const invalidated = await invalidatePreciseTargets(validatedData.targets);
        results.invalidated_targets.push(...invalidated.paths);
        results.revalidated_tags.push(...invalidated.tags);
      } catch (error) {
        console.error('Error with precise invalidation:', error);
        results.errors.push('Failed to process precise invalidation targets');
      }
    }

    const hasErrors = results.errors.length > 0;
    const status = hasErrors ? 207 : 200; // 207 Multi-Status for partial success

    return NextResponse.json({
      success: !hasErrors || (results.revalidated_tags.length > 0 || results.revalidated_paths.length > 0 || results.invalidated_targets.length > 0),
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

POST /api/revalidate (T018 - Precise targets)
{
  "targets": {
    "home": true,
    "year": "year-id-123",
    "collection": "collection-id-456"
  }
}
*/
