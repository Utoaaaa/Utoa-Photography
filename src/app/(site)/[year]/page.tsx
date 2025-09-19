import { notFound } from 'next/navigation';
import { getYearByLabel } from '@/lib/queries/years';
import { getCollectionsByYear } from '@/lib/queries/collections';
import { CollectionList } from '../../../components/ui/CollectionList';
import { Breadcrumb } from '../../../components/ui/Breadcrumb';

interface YearPageProps {
  params: Promise<{
    year: string;
  }>;
}

export default async function YearPage({ params }: YearPageProps) {
  const { year: yearLabel } = await params;
  const decodedYearLabel = decodeURIComponent(yearLabel);
  
  // Fetch year data
  const year = await getYearByLabel(decodedYearLabel);
  
  if (!year) {
    notFound();
  }
  
  // Fetch collections for this year
  const collections = await getCollectionsByYear(year.id);
  
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <Breadcrumb 
              items={[
                { label: 'UTOA', href: '/' },
                { label: decodedYearLabel, href: `/${yearLabel}` }
              ]}
            />
            
            <div className="mt-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extralight tracking-wide text-gray-900">
                {decodedYearLabel}
              </h1>
              
              {collections.length > 0 && (
                <p className="mt-4 text-gray-600 text-lg">
                  {collections.length} {collections.length === 1 ? 'collection' : 'collections'}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {collections.length > 0 ? (
          <CollectionList 
            collections={collections}
            yearLabel={decodedYearLabel}
          />
        ) : (
          <div className="text-center py-24" data-testid="empty-collections">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                {/* Camera icon */}
                <div className="w-12 h-8 border-2 border-gray-300 rounded-sm relative">
                  <div className="w-6 h-6 bg-gray-300 rounded-full absolute -top-2 left-1/2 transform -translate-x-1/2"></div>
                  <div className="w-4 h-4 bg-white border border-gray-300 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                </div>
              </div>
              
              <h2 className="text-xl font-light text-gray-900 mb-2">
                No collections yet
              </h2>
              <p className="text-gray-500">
                Collections for {decodedYearLabel} will appear here when they&apos;re published.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: YearPageProps) {
  const { year: yearLabel } = await params;
  const decodedYearLabel = decodeURIComponent(yearLabel);
  
  const year = await getYearByLabel(decodedYearLabel);
  
  if (!year) {
    return {
      title: 'Year Not Found | UTOA Photography',
    };
  }
  
  return {
    title: `${decodedYearLabel} | UTOA Photography`,
    description: `Photography collections from ${decodedYearLabel} by UTOA`,
  };
}