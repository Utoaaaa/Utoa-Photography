import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type CollectionStatus = 'draft' | 'published';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year_id: string }> }
) {
  try {
    const { year_id } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(year_id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Year ID must be a valid UUID' },
        { status: 400 }
      );
    }

    // Validate status parameter
    if (status && !['draft', 'published', 'all'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status', message: 'Status must be draft, published, or all' },
        { status: 400 }
      );
    }

    // Verify year exists
    const year = await prisma.year.findUnique({
      where: { id: year_id },
    });

    if (!year) {
      return NextResponse.json(
        { error: 'Not found', message: 'Year not found' },
        { status: 404 }
      );
    }

    // Build where clause
    const where: any = { year_id };
    if (status && status !== 'all') {
      where.status = status as CollectionStatus;
    }

    // Query collections
    const collections = await prisma.collection.findMany({
      where,
      include: {
        cover_asset: true,
        _count: {
          select: {
            collection_assets: true,
          },
        },
      },
      orderBy: {
        order_index: 'asc',
      },
    });

    return NextResponse.json(collections);
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ year_id: string }> }
) {
  try {
    const { year_id } = await params;
    const body = await request.json();
    const { slug, title, summary, cover_asset_id, status = 'draft', order_index } = body;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(year_id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Year ID must be a valid UUID' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!slug || !title) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'Slug and title are required' },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'Invalid slug format', message: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Validate status
    if (status && !['draft', 'published'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status', message: 'Status must be draft or published' },
        { status: 400 }
      );
    }

    // Verify year exists
    const year = await prisma.year.findUnique({
      where: { id: year_id },
    });

    if (!year) {
      return NextResponse.json(
        { error: 'Not found', message: 'Year not found' },
        { status: 404 }
      );
    }

    // Check for duplicate slug within the year
    const existingCollection = await prisma.collection.findUnique({
      where: {
        year_id_slug: {
          year_id,
          slug,
        },
      },
    });

    if (existingCollection) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Collection with this slug already exists in this year' },
        { status: 409 }
      );
    }

    // Auto-generate order_index if not provided
    const finalOrderIndex = order_index || `${Date.now()}.0`;

    // Set published_at if status is published
    const published_at = status === 'published' ? new Date() : null;

    // Create new collection
    const collection = await prisma.collection.create({
      data: {
        year_id,
        slug,
        title,
        summary,
        cover_asset_id,
        status: status as CollectionStatus,
        order_index: finalOrderIndex,
        published_at,
      },
      include: {
        cover_asset: true,
        year: true,
      },
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    console.error('Error creating collection:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create collection' },
      { status: 500 }
    );
  }
}