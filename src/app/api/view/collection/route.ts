import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearLabel = searchParams.get('year');
    const slug = searchParams.get('slug');

    if (!yearLabel || !slug) {
      const body = JSON.stringify({ error: 'Bad Request', message: 'Missing year or slug' });
      return new Response(body, { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } });
    }

  const year = await prisma.year.findFirst({ where: { label: yearLabel, status: 'published' }, orderBy: { created_at: 'desc' } });
    if (!year) {
      const body = JSON.stringify({ error: 'Not Found', message: 'Year not found' });
      return new Response(body, { status: 404, headers: { 'content-type': 'application/json; charset=utf-8' } });
    }

    const collection = await prisma.collection.findUnique({
      where: { year_id_slug: { year_id: year.id, slug } },
      include: {
        collection_assets: {
          include: { asset: true },
          orderBy: { order_index: 'asc' },
        },
      },
    });

    if (!collection) {
      const body = JSON.stringify({ error: 'Not Found', message: 'Collection not found' });
      return new Response(body, { status: 404, headers: { 'content-type': 'application/json; charset=utf-8' } });
    }

    const photos = collection.collection_assets.map((ca) => {
      let metadata: any = null;
      if (ca.asset.metadata_json && typeof ca.asset.metadata_json === 'string') {
        try { metadata = JSON.parse(ca.asset.metadata_json); } catch { metadata = null; }
      }
      return {
        id: ca.asset.id,
        alt: ca.asset.alt,
        caption: ca.asset.caption ?? null,
        width: ca.asset.width,
        height: ca.asset.height,
        metadata_json: metadata,
      };
    });

    const body = JSON.stringify({
      year: { id: year.id, label: year.label },
      collection: { id: collection.id, slug: collection.slug, title: collection.title, summary: collection.summary ?? null },
      photos,
    });
    return new Response(body, { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (error) {
    const body = JSON.stringify({ error: 'Internal Server Error' });
    return new Response(body, { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } });
  }
}
