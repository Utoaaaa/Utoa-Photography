/**
 * Publishing Checklist API
 * 
 * GET /api/publishing/collections/{id}/checklist
 * Validates collection readiness for publishing
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

interface PublishingRequirement {
  key: string;
  description: string;
  status: 'passed' | 'failed' | 'warning';
  details?: string;
}

interface ChecklistResponse {
  collection_id: string;
  overall_status: 'ready' | 'pending' | 'blocked';
  requirements: PublishingRequirement[];
  missing_count: number;
  warning_count: number;
  can_publish: boolean;
}

const paramsSchema = z.object({
  collection_id: z.string().uuid('Invalid collection ID format')
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection_id: string }> }
) {
  try {
    // Validate parameters - await params in Next.js 15
    const { collection_id } = paramsSchema.parse(await params);

    // Get collection with assets and related data
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

    // Validate publishing requirements
    const requirements: PublishingRequirement[] = [];

    // 1. Collection must have a title
    requirements.push({
      key: 'collection_title',
      description: 'Collection must have a title',
      status: collection.title.trim() ? 'passed' : 'failed',
      details: collection.title.trim() ? undefined : 'Title is required'
    });

    // 2. Collection must have at least one asset
    const assetCount = collection.collection_assets.length;
    requirements.push({
      key: 'has_assets',
      description: 'Collection must contain at least one image',
      status: assetCount > 0 ? 'passed' : 'failed',
      details: assetCount === 0 ? 'At least one image is required' : `${assetCount} image(s) found`
    });

    // 3. All assets must have alt text
    const assetsWithoutAlt = collection.collection_assets.filter(
      ca => !ca.asset.alt || ca.asset.alt.trim() === ''
    );
    requirements.push({
      key: 'assets_alt_text',
      description: 'All images must have alt text for accessibility',
      status: assetsWithoutAlt.length === 0 ? 'passed' : 'failed',
      details: assetsWithoutAlt.length > 0 
        ? `${assetsWithoutAlt.length} image(s) missing alt text` 
        : 'All images have alt text'
    });

    // 4. SEO title (recommended but not required)
    requirements.push({
      key: 'seo_title',
      description: 'SEO title for better search visibility',
      status: collection.seo_title && collection.seo_title.trim() 
        ? 'passed' 
        : 'warning',
      details: collection.seo_title && collection.seo_title.trim()
        ? 'Custom SEO title set'
        : 'Using collection title for SEO (recommended to set custom SEO title)'
    });

    // 5. SEO description (recommended but not required)
    requirements.push({
      key: 'seo_description',
      description: 'SEO description for better search visibility',
      status: collection.seo_description && collection.seo_description.trim()
        ? 'passed'
        : 'warning',
      details: collection.seo_description && collection.seo_description.trim()
        ? 'SEO description set'
        : 'SEO description recommended for better search visibility'
    });

    // 6. Collection summary (recommended)
    requirements.push({
      key: 'collection_summary',
      description: 'Collection summary for context',
      status: collection.summary && collection.summary.trim()
        ? 'passed'
        : 'warning',
      details: collection.summary && collection.summary.trim()
        ? 'Summary provided'
        : 'Collection summary recommended'
    });

    // 7. Cover asset (recommended)
    requirements.push({
      key: 'cover_asset',
      description: 'Cover image for collection preview',
      status: collection.cover_asset_id ? 'passed' : 'warning',
      details: collection.cover_asset_id 
        ? 'Cover image set'
        : 'Cover image recommended (will use first image as default)'
    });

    // 8. Asset descriptions (recommended for storytelling)
    const assetsWithDescriptions = collection.collection_assets.filter(
      ca => ca.asset.description && ca.asset.description.trim()
    );
    const descriptionCoverage = assetCount > 0 ? (assetsWithDescriptions.length / assetCount) * 100 : 0;
    
    requirements.push({
      key: 'asset_descriptions',
      description: 'Asset descriptions for storytelling',
      status: descriptionCoverage >= 50 ? 'passed' : 'warning',
      details: `${Math.round(descriptionCoverage)}% of images have descriptions`
    });

    // Calculate overall status
    const failedRequirements = requirements.filter(r => r.status === 'failed');
    const warningRequirements = requirements.filter(r => r.status === 'warning');
    
    const canPublish = failedRequirements.length === 0;
    let overallStatus: 'ready' | 'pending' | 'blocked';
    
    if (failedRequirements.length > 0) {
      overallStatus = 'blocked';
    } else if (warningRequirements.length > 0) {
      overallStatus = 'pending';
    } else {
      overallStatus = 'ready';
    }

    const response: ChecklistResponse = {
      collection_id,
      overall_status: overallStatus,
      requirements,
      missing_count: failedRequirements.length,
      warning_count: warningRequirements.length,
      can_publish: canPublish
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error checking publishing requirements:', error);
    
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