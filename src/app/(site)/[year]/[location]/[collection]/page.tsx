import { notFound } from 'next/navigation';

import { fetchCollectionForViewer } from '@/lib/viewer/collection';

import CollectionViewer from './CollectionViewer';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ year: string; location: string; collection: string }>;
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

  return (
    <div className="min-h-screen bg-background">
      <CollectionViewer data={data} fallbackLocationSlug={decodedLocationSlug} />
    </div>
  );
}
