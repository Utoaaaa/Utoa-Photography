import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawYear = searchParams.get('year');
    const rawSlug = searchParams.get('slug');
    const yearLabel = (rawYear ?? '').trim();
    const slug = (rawSlug ?? '').trim();

    if (!yearLabel || !slug) {
      const body = JSON.stringify({ error: 'Bad Request', message: 'Missing year or slug' });
      return new Response(body, { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } });
    }

    const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[GET /api/view/collection] query:', { year: yearLabel, slug });
    }

    // Prefer resolving by (year.label, slug) to avoid ambiguity if duplicate year labels exist
    let collection = await prisma.collection.findFirst({
      where: {
        slug,
        year: {
          label: yearLabel,
          status: 'published',
        },
      },
      orderBy: [
        { year: { created_at: 'desc' } },
        { created_at: 'desc' },
      ],
      include: {
        collection_assets: {
          include: { asset: true },
          orderBy: { order_index: 'asc' },
        },
        year: true,
      },
    });
    // In development, allow viewing collections from any year status for easier local testing
    if (!collection && process.env.NODE_ENV !== 'production') {
      console.log('[GET /api/view/collection] collection not found in published year, trying any status for year label:', yearLabel);
      collection = await prisma.collection.findFirst({
        where: {
          slug,
          year: { label: yearLabel },
        },
        orderBy: [
          { year: { created_at: 'desc' } },
          { created_at: 'desc' },
        ],
        include: {
          collection_assets: {
            include: { asset: true },
            orderBy: { order_index: 'asc' },
          },
          year: true,
        },
      });
    }
    if (!collection && isUUID(slug)) {
      // Fallback: allow direct collection id
      collection = await prisma.collection.findUnique({
        where: { id: slug },
        include: {
          collection_assets: {
            include: { asset: true },
            orderBy: { order_index: 'asc' },
          },
          year: true,
        },
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log('[GET /api/view/collection] slug looked like UUID, lookup by id result:', !!collection);
      }
    }

    if (!collection) {
      const body = JSON.stringify({ error: 'Not Found', message: 'Collection not found' });
      return new Response(body, { status: 404, headers: { 'content-type': 'application/json; charset=utf-8' } });
    }

    // Build response using the joined year relation on collection
    const response = {
      year: { id: collection.year!.id, label: collection.year!.label },
      collection: {
        id: collection.id,
        slug: collection.slug,
        title: collection.title,
        summary: collection.summary ?? null,
      },
      photos: collection.collection_assets.map((ca) => ({
        id: ca.asset.id,
        alt: ca.asset.alt,
        caption: ca.asset.caption,
        width: ca.asset.width,
        height: ca.asset.height,
      })),
    };

    return NextResponse.json(response, { status: 200 });
  } catch {
    const body = JSON.stringify({ error: 'Internal Server Error' });
    return new Response(body, { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } });
  }
}
