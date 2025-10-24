import { NextRequest, NextResponse } from 'next/server';
import { shouldUseD1Direct } from '@/lib/d1-queries';
import { getD1Database } from '@/lib/cloudflare';

export const dynamic = 'force-dynamic';

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

interface D1CollectionRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  location_id: string | null;
  year_id: string;
  year_label: string;
  year_status: string;
  location_slug: string | null;
  location_name: string | null;
  location_summary: string | null;
}

interface CollectionResponse {
  year: { id: string; label: string };
  location: {
    id: string;
    slug: string;
    name: string;
    summary: string | null;
  } | null;
  collection: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
  };
  photos: Array<{ id: string; alt: string; caption: string | null; width: number; height: number }>;
}

async function fetchCollectionBySlugD1(params: { yearLabel: string; slug: string; allowAnyYearStatus: boolean }): Promise<CollectionResponse | null> {
  const { yearLabel, slug, allowAnyYearStatus } = params;
  const db = requireD1();

  const row = await db.prepare(
    `
      SELECT
        c.id,
        c.slug,
        c.title,
        c.summary,
        c.location_id,
        c.year_id,
        y.label AS year_label,
        y.status AS year_status,
        l.slug AS location_slug,
        l.name AS location_name,
        l.summary AS location_summary
      FROM collections c
      JOIN years y ON y.id = c.year_id
      LEFT JOIN locations l ON l.id = c.location_id
      WHERE c.slug = ?1 AND y.label = ?2
      ${allowAnyYearStatus ? '' : "AND y.status = 'published'"}
      ORDER BY y.created_at DESC, c.created_at DESC
      LIMIT 1
    `,
  ).bind(slug, yearLabel).first() as D1CollectionRow | null;

  if (!row) {
    return null;
  }

  return buildCollectionResponseD1(row);
}

async function fetchCollectionByIdD1(collectionId: string): Promise<CollectionResponse | null> {
  const db = requireD1();

  const row = await db.prepare(
    `
      SELECT
        c.id,
        c.slug,
        c.title,
        c.summary,
        c.location_id,
        c.year_id,
        y.label AS year_label,
        y.status AS year_status,
        l.slug AS location_slug,
        l.name AS location_name,
        l.summary AS location_summary
      FROM collections c
      JOIN years y ON y.id = c.year_id
      LEFT JOIN locations l ON l.id = c.location_id
      WHERE c.id = ?1
      LIMIT 1
    `,
  ).bind(collectionId).first() as D1CollectionRow | null;

  if (!row) {
    return null;
  }

  return buildCollectionResponseD1(row);
}

async function buildCollectionResponseD1(row: D1CollectionRow): Promise<CollectionResponse> {
  const db = requireD1();

  const assetsResult = await db.prepare(
    `
      SELECT
        a.id,
        a.alt,
        a.caption,
        a.width,
        a.height
      FROM collection_assets ca
      JOIN assets a ON a.id = ca.asset_id
      WHERE ca.collection_id = ?1
      ORDER BY CAST(ca.order_index AS REAL) ASC, ca.order_index ASC, ca.created_at ASC
    `,
  ).bind(row.id).all();

  const photos = (assetsResult.results ?? []).map((asset: Record<string, unknown>) => ({
    id: String(asset.id),
    alt: String(asset.alt ?? ''),
    caption: asset.caption != null ? String(asset.caption) : null,
    width: Number(asset.width ?? 0),
    height: Number(asset.height ?? 0),
  }));

  const location = row.location_id
    ? {
        id: String(row.location_id),
        slug: row.location_slug ? String(row.location_slug) : '',
        name: row.location_name ? String(row.location_name) : '',
        summary: row.location_summary != null ? String(row.location_summary) : null,
      }
    : null;

  return {
    year: { id: String(row.year_id), label: String(row.year_label) },
    location,
    collection: {
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title),
      summary: row.summary != null ? String(row.summary) : null,
    },
    photos,
  };
}

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

    const useD1 = shouldUseD1Direct();
    const isDev = process.env.NODE_ENV !== 'production';

    let response: CollectionResponse | null = null;

    if (useD1) {
      response = await fetchCollectionBySlugD1({ yearLabel, slug, allowAnyYearStatus: false });
      if (!response && isDev) {
        response = await fetchCollectionBySlugD1({ yearLabel, slug, allowAnyYearStatus: true });
      }
      if (!response && isUUID(slug)) {
        response = await fetchCollectionByIdD1(slug);
      }
    } else {
      const prisma = await getPrisma();

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
          location: true,
        },
      });

      if (!collection && isDev) {
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
            location: true,
          },
        });
      }

      if (!collection && isUUID(slug)) {
        collection = await prisma.collection.findUnique({
          where: { id: slug },
          include: {
            collection_assets: {
              include: { asset: true },
              orderBy: { order_index: 'asc' },
            },
            year: true,
            location: true,
          },
        });
        if (isDev) {
          console.log('[GET /api/view/collection] slug looked like UUID, lookup by id result:', !!collection);
        }
      }

      if (collection) {
        response = {
          year: { id: collection.year!.id, label: collection.year!.label },
          location: collection.location
            ? {
                id: collection.location.id,
                slug: collection.location.slug,
                name: collection.location.name,
                summary: collection.location.summary ?? null,
              }
            : null,
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
      }
    }

    if (!response) {
      const body = JSON.stringify({ error: 'Not Found', message: 'Collection not found' });
      return new Response(body, { status: 404, headers: { 'content-type': 'application/json; charset=utf-8' } });
    }

    return NextResponse.json(response, { status: 200 });
  } catch {
    const body = JSON.stringify({ error: 'Internal Server Error' });
    return new Response(body, { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } });
  }
}
