import dynamic from 'next/dynamic';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import type { CollectionViewerPayload } from '@/lib/viewer/collection';

const PhotoViewer = dynamic(
  () => import('@/components/ui/PhotoViewer').then((mod) => ({ default: mod.PhotoViewer })),
  {
    ssr: true,
  }
);

import { BackToTopButton } from './BackToTopButton';

interface Props {
  data: CollectionViewerPayload;
  fallbackLocationSlug: string;
}

export default function CollectionViewer({ data, fallbackLocationSlug }: Props) {
  const { collection, location, photos, year } = data;
  const anchorSafeYear = year.label.replace(/\s+/g, '-');
  const yearHref = `/#year-${encodeURIComponent(anchorSafeYear)}`;
  const resolvedLocationSlug = location?.slug ?? fallbackLocationSlug;
  const locationLabel = location?.name ?? '未指派地點';
  const locationHref = resolvedLocationSlug
    ? `/${encodeURIComponent(year.label)}/${encodeURIComponent(resolvedLocationSlug)}`
    : yearHref;

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: year.label, href: yearHref },
    { label: locationLabel, href: locationHref },
    {
      label: collection.title,
      href: resolvedLocationSlug
        ? `/${encodeURIComponent(year.label)}/${encodeURIComponent(resolvedLocationSlug)}/${encodeURIComponent(collection.slug)}`
        : `/${encodeURIComponent(year.label)}/${encodeURIComponent(collection.slug)}`,
    },
  ];

  return (
    <div data-testid="photo-viewer-container">
      <header className="relative z-10 bg-background px-6 pt-[calc(env(safe-area-inset-top)+6rem)] pb-6 sm:px-8 md:px-12 md:pt-24 md:pb-8 lg:px-16 lg:pt-24 lg:pb-10">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
            <Breadcrumb items={breadcrumbItems} />
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Collection</p>
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-gray-900 md:text-5xl">
              {collection.title}
            </h1>
          </div>
          {collection.summary ? (
            <p className="max-w-3xl text-base leading-relaxed text-gray-600 md:text-lg">
              {collection.summary}
            </p>
          ) : null}
          <div className="text-sm text-gray-500">
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
          </div>
        </div>
      </header>

      <main className="bg-background -mt-8 sm:-mt-10 md:-mt-14 lg:-mt-16">
        {photos.length > 0 ? (
          <PhotoViewer photos={photos} collectionTitle={collection.title} singleScreen={false} />
        ) : (
          <div
            className="mx-auto max-w-6xl px-8 py-24 md:px-12 lg:px-16"
            data-testid="empty-photos"
          >
            <div className="text-center">
              <h2 className="mb-2 text-xl font-medium text-gray-900">No photos yet</h2>
              <p className="text-gray-500">Photos will appear after upload.</p>
            </div>
          </div>
        )}
      </main>

      <div className="bg-background w-full flex items-center justify-center py-10">
        <BackToTopButton />
      </div>
    </div>
  );
}
