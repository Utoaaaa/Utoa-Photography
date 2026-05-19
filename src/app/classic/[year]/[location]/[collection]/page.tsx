import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import CollectionViewer from '@/app/(site)/[year]/[location]/[collection]/CollectionViewer';
import { fetchCollectionForViewer } from '@/lib/viewer/collection';

export const revalidate = 60;

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

interface PageProps {
  params: Promise<{ year: string; location: string; collection: string }>;
}

export default async function ClassicCollectionPage({ params }: PageProps) {
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

  return (
    <div className="min-h-screen bg-background">
      <CollectionViewer data={data} fallbackLocationSlug={decodedLocationSlug} basePath="/classic" />
    </div>
  );
}
