'use client';

import { useParams } from 'next/navigation';

import ClientCollectionViewer from './ClientCollectionViewer';

export default function CollectionPage() {
  const params = useParams<{ year: string; location: string; collection: string }>();
  const decodedYearLabel = decodeURIComponent(params.year);
  const decodedLocationSlug = decodeURIComponent(params.location);
  const decodedCollectionSlug = decodeURIComponent(params.collection);

  return (
    <div className="min-h-screen bg-background">
      <ClientCollectionViewer
        yearLabel={decodedYearLabel}
        locationSlug={decodedLocationSlug}
        collectionSlug={decodedCollectionSlug}
      />
    </div>
  );
}
