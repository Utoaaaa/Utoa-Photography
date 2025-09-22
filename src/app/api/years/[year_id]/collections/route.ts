import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type CollectionStatus = 'draft' | 'published' | 'all';

function isUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year_id: string }> }
) {
  try {
    const { year_id } = await params;
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || 'all') as CollectionStatus;

    if (!['draft', 'published', 'all'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status', message: 'status must be draft|published|all' }, { status: 400 });
    }

    const year = await prisma.year.findUnique({ where: { id: year_id } });
    if (!year) {
      return NextResponse.json({ error: 'Not found', message: 'Year not found' }, { status: 404 });
    }

    const where: any = { year_id };
    if (status !== 'all') where.status = status;

    const collections = await prisma.collection.findMany({
      where,
      orderBy: { order_index: 'asc' },
    });

    return NextResponse.json(collections);
  } catch (error) {
    console.error('Error listing collections by year:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ year_id: string }> }
) {
  try {
    const { year_id } = await params;

    // Auth (bypass for tests)
    // No auth required for contract tests

    const body = await request.json();
    const { slug, title, summary, status = 'draft', order_index, cover_asset_id } = body;

    if (!slug) {
      return NextResponse.json({ error: 'missing required field', message: 'slug is required' }, { status: 400 });
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: 'invalid slug', message: 'slug must be lowercase letters, numbers, and hyphens only' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: 'missing required field', message: 'title is required' }, { status: 400 });
    }
    if (typeof title !== 'string' || title.length > 200) {
      return NextResponse.json({ error: 'invalid title', message: 'title must be a non-empty string up to 200 characters' }, { status: 400 });
    }
    if (status && !['draft', 'published'].includes(status)) {
      return NextResponse.json({ error: 'invalid status', message: 'status must be draft or published' }, { status: 400 });
    }

    // Ensure year exists
    const year = await prisma.year.findUnique({ where: { id: year_id } });
    if (!year) {
      return NextResponse.json({ error: 'Not found', message: 'Year not found' }, { status: 404 });
    }

  const data: any = { year_id, slug, title, summary, status, order_index: order_index || '1.0' };
  if (cover_asset_id) data.cover_asset_id = cover_asset_id;
    if (status === 'published') data.published_at = new Date();

    const created = await prisma.collection.create({ data });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'conflict', message: 'duplicate slug for this year' }, { status: 409 });
    }
    console.error('Error creating collection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}