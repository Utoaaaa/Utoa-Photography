"use client";
import { useParams } from 'next/navigation';
import ClientCollectionViewer from './ClientCollectionViewer';

// Client-only page; route options handled by parent layout if needed

export default function CollectionPage() {
  const params = useParams<{ year: string; collection: string }>();
  const decodedYearLabel = decodeURIComponent(params.year);
  const decodedCollectionSlug = decodeURIComponent(params.collection);
  return (
    <div className="min-h-screen bg-white">
      <ClientCollectionViewer yearLabel={decodedYearLabel} collectionSlug={decodedCollectionSlug} />
    </div>
  );
}

// Generate metadata for SEO
// Metadata handled at layout level for client-only page