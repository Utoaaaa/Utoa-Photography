import { NextRequest, NextResponse } from 'next/server';
import { fetchCollectionByIdForViewer, fetchCollectionForViewer } from '@/lib/viewer/collection';

export const dynamic = 'force-dynamic';

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

    const isDev = process.env.NODE_ENV !== 'production';
    let response = await fetchCollectionForViewer({ yearLabel, slug });
    if (!response && isDev) {
      console.log('[GET /api/view/collection] collection not found in published year, allowAnyYearStatus fallback');
      response = await fetchCollectionForViewer({ yearLabel, slug, allowAnyYearStatus: true });
    }
    if (!response && isUUID(slug)) {
      response = await fetchCollectionByIdForViewer(slug);
      if (isDev) {
        console.log('[GET /api/view/collection] slug looked like UUID, lookup by id result:', !!response);
      }
    }

    if (!response) {
      const body = JSON.stringify({ error: 'Not Found', message: 'Collection not found' });
      return new Response(body, { status: 404, headers: { 'content-type': 'application/json; charset=utf-8' } });
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch {
    const body = JSON.stringify({ error: 'Internal Server Error' });
    return new Response(body, { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } });
  }
}
