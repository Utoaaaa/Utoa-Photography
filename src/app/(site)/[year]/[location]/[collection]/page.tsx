import type { Metadata } from 'next';
import { getPageSEO } from '@/lib/seo/store';
import { notFound } from 'next/navigation';

import { AnimatedCollectionShell } from '@/components/site/animated';
import { fetchCollectionForViewer } from '@/lib/viewer/collection';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ year: string; location: string; collection: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const decodedYearLabel = decodeURIComponent(resolvedParams.year);
  const decodedLocationSlug = decodeURIComponent(resolvedParams.location);
  const decodedCollectionSlug = decodeURIComponent(resolvedParams.collection);

  const data = await fetchCollectionForViewer({ yearLabel: decodedYearLabel, slug: decodedCollectionSlug });
  if (!data || (data.location?.slug && data.location.slug !== decodedLocationSlug)) {
    return {
      title: '找不到作品集 | UTOA Photography',
    };
  }

  const description = data.collection.summary ?? '探索這組攝影作品與故事。';
  const locationSlug = data.location?.slug ?? decodedLocationSlug;
  const canonical = `/${encodeURIComponent(data.year.label)}/${encodeURIComponent(locationSlug)}/${encodeURIComponent(data.collection.slug)}`;

  return getPageSEO('collection', data.collection.id, {
    title: `${data.collection.title} — ${data.year.label} | UTOA Photography`, description,
  }, canonical);
}

export default async function CollectionPage({ params }: PageProps) {
  const resolvedParams = await params;
  const decodedYearLabel = decodeURIComponent(resolvedParams.year);
  const decodedLocationSlug = decodeURIComponent(resolvedParams.location);
  const decodedCollectionSlug = decodeURIComponent(resolvedParams.collection);

  const data = await fetchCollectionForViewer({ yearLabel: decodedYearLabel, slug: decodedCollectionSlug });
  if (!data) {
    notFound();
  }

  if (data.location?.slug && data.location.slug !== decodedLocationSlug) {
    notFound();
  }

  return <AnimatedCollectionShell data={data} fallbackLocationSlug={decodedLocationSlug} />;
}
