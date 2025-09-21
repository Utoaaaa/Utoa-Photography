import { notFound } from 'next/navigation';
import { getYearByLabel } from '@/lib/queries/years';
import { getCollectionBySlug } from '@/lib/queries/collections';
import { PhotoViewer } from '../../../../components/ui/PhotoViewer';
import { Breadcrumb } from '../../../../components/ui/Breadcrumb';

interface CollectionPageProps {
  params: Promise<{
    year: string;
    collection: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const { year: yearLabel, collection: collectionSlug } = await params;
  const decodedYearLabel = decodeURIComponent(yearLabel);
  const decodedCollectionSlug = decodeURIComponent(collectionSlug);
  
  // T033: Enable single-screen mode for testing with ?view=fullscreen
  const currentSearchParams = await searchParams;
  const viewMode = currentSearchParams?.view;
  const singleScreenMode = viewMode === 'fullscreen';
  
  // Fetch year data first
  const year = await getYearByLabel(decodedYearLabel);
  
  if (!year) {
    notFound();
  }
  
  // Fetch collection data
  const collection = await getCollectionBySlug(year.id, decodedCollectionSlug);
  
  if (!collection) {
    notFound();
  }
  
  // Get all photos from collection assets
  const photos = collection.collection_assets.map((ca) => ca.asset);
  
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <Breadcrumb 
              items={[
                { label: 'UTOA', href: '/' },
                { label: decodedYearLabel, href: `/${yearLabel}` },
                { label: collection.title, href: `/${yearLabel}/${collectionSlug}` }
              ]}
            />
            
            <div className="mt-6">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extralight tracking-wide text-gray-900">
                {collection.title}
              </h1>
              
              {collection.summary && (
                <p className="mt-4 text-gray-600 text-lg max-w-3xl">
                  {collection.summary}
                </p>
              )}
              
              <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
                <span>
                  {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                </span>
                
                {collection.published_at && (
                  <time dateTime={collection.published_at.toISOString()}>
                    {collection.published_at.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </time>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Photo viewer */}
      <main>
        {photos.length > 0 ? (
          <PhotoViewer 
            photos={photos}
            collectionTitle={collection.title}
            singleScreen={singleScreenMode}
          />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24" data-testid="empty-photos">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                {/* Camera icon */}
                <div className="w-12 h-8 border-2 border-gray-300 rounded-sm relative">
                  <div className="w-6 h-6 bg-gray-300 rounded-full absolute -top-2 left-1/2 transform -translate-x-1/2"></div>
                  <div className="w-4 h-4 bg-white border border-gray-300 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                </div>
              </div>
              
              <h2 className="text-xl font-light text-gray-900 mb-2">
                No photos yet
              </h2>
              <p className="text-gray-500">
                Photos from this collection will appear here when they&apos;re uploaded.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: CollectionPageProps) {
  const { year: yearLabel, collection: collectionSlug } = await params;
  const decodedYearLabel = decodeURIComponent(yearLabel);
  const decodedCollectionSlug = decodeURIComponent(collectionSlug);
  
  const year = await getYearByLabel(decodedYearLabel);
  
  if (!year) {
    return {
      title: 'Collection Not Found | UTOA Photography',
    };
  }
  
  const collection = await getCollectionBySlug(year.id, decodedCollectionSlug);
  
  if (!collection) {
    return {
      title: 'Collection Not Found | UTOA Photography',
    };
  }
  
  return {
    title: `${collection.title} | ${decodedYearLabel} | UTOA Photography`,
    description: collection.summary || `Photography collection "${collection.title}" from ${decodedYearLabel} by UTOA`,
    openGraph: collection.cover_asset ? {
      images: [
        {
          url: `https://imagedelivery.net/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH}/${collection.cover_asset.id}/og`,
          width: 1200,
          height: 630,
          alt: collection.cover_asset.alt,
        },
      ],
    } : undefined,
  };
}