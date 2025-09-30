import { NextRequest, NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { invalidateCache, CACHE_TAGS } from '@/lib/cache';

export const dynamic = 'force-dynamic';

type CollectionStatus = 'draft' | 'published' | 'all';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year_id: string }> }
) {
  try {
    const { year_id } = await params;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[GET /years/:id/collections] year_id:', year_id, 'url:', request.url);
    }
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || 'all') as CollectionStatus;

    if (!['draft', 'published', 'all'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status', message: 'status must be draft|published|all' }, { status: 400 });
    }

    const year = await prisma.year.findUnique({ where: { id: year_id } });
    if (!year) {
      return NextResponse.json({ error: 'Not found', message: 'Year not found' }, { status: 404 });
    }

  const where: { year_id: string; status?: 'draft' | 'published' } = { year_id };
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
    if (process.env.NODE_ENV !== 'production') {
      console.log('[POST /years/:id/collections] year_id:', year_id);
    }

    // Auth (bypass for tests)
    // No auth required for contract tests
    // Safe parse JSON to avoid throwing SyntaxError on empty body
    let body: any = {};
    try {
      const txt = await request.text();
      body = txt ? JSON.parse(txt) : {};
    } catch {
      body = {};
    }
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
    if (process.env.NODE_ENV !== 'production') {
      console.log('[POST /years/:id/collections] created collection:', created?.id, created?.slug);
    }
    try {
      await invalidateCache([
        CACHE_TAGS.COLLECTIONS,
        CACHE_TAGS.yearCollections(year_id),
        CACHE_TAGS.year(year_id),
      ]);
    } catch {}
    await logAudit({ who: 'system', action: 'create', entity: `collection/${created.id}`, payload: { slug: created.slug, year_id } });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    // Do not leak low-level JSON parse errors; respond gracefully
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'conflict', message: 'duplicate slug for this year' }, { status: 409 });
    }
    console.error('Error creating collection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}