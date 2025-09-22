import { prisma } from '@/lib/db';
import { PhotoViewer } from '@/components/ui/PhotoViewer';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function TestCollectionStaticPage() {
  const yearLabel = '2024';
  const slug = 'test-collection';

  const year = await prisma.year.findFirst({ where: { label: yearLabel, status: 'published' }, orderBy: { created_at: 'desc' } });
  if (!year) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-24 text-center text-gray-500">Year not found</div>
      </div>
    );
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
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-24 text-center text-gray-500">Collection not found</div>
      </div>
    );
  }

  const photos = collection.collection_assets.map((ca) => ({
    id: ca.asset.id,
    alt: ca.asset.alt,
    caption: ca.asset.caption ?? null,
    width: ca.asset.width,
    height: ca.asset.height,
  }));

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumb 
            items={[
              { label: 'UTOA', href: '/' },
              { label: year.label, href: `/${year.label}` },
              { label: collection.title, href: `/${year.label}/${collection.slug}` },
            ]}
          />
          <h1 className="mt-6 text-3xl md:text-4xl lg:text-5xl font-extralight tracking-wide text-gray-900">
            {collection.title}
          </h1>
          {collection.summary && (
            <p className="mt-4 text-gray-600 text-lg max-w-3xl">{collection.summary}</p>
          )}
          <div className="mt-4 text-sm text-gray-500">{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</div>
        </div>
      </header>
      <main>
        {photos.length > 0 ? (
          <PhotoViewer photos={photos} collectionTitle={collection.title} singleScreen={true} />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24" data-testid="empty-photos">
            <div className="text-center">
              <h2 className="text-xl font-light text-gray-900 mb-2">No photos yet</h2>
              <p className="text-gray-500">Photos will appear after upload.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
