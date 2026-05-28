import Link from 'next/link';

import { PhotoViewer } from '@/components/ui/PhotoViewer';
import { buildHomeHref, buildLocationHref, buildYearHref } from '@/lib/site-paths';
import type { CollectionViewerPayload } from '@/lib/viewer/collection';

import { AnimatedArchiveStyles } from './AnimatedArchiveStyles';

interface AnimatedCollectionShellProps {
  data: CollectionViewerPayload;
  fallbackLocationSlug?: string;
  homeHref?: string;
}

export function AnimatedCollectionShell({
  data,
  fallbackLocationSlug = '',
  homeHref = buildHomeHref(),
}: AnimatedCollectionShellProps) {
  const { collection, location, photos, year } = data;
  const resolvedLocationSlug = location?.slug ?? fallbackLocationSlug;
  const locationLabel = location?.name ?? 'Unassigned location';
  const yearHref = buildYearHref(year.label);
  const locationHref = resolvedLocationSlug
    ? buildLocationHref(year.label, resolvedLocationSlug)
    : yearHref;

  return (
    <main className="animated-archive-home animated-collection-viewer relative min-h-screen overflow-hidden bg-background px-6 py-8 text-foreground sm:px-8 md:px-12">
      <div className="pointer-events-none fixed inset-0 z-0 animated-exposure-field" aria-hidden="true" />

      <div className="relative z-10">
        <div className="mx-auto max-w-7xl">
          <nav className="mb-8 flex flex-wrap items-center gap-3 text-sm font-medium text-gray-600" aria-label="Breadcrumbs">
            <Link className="transition hover:text-gray-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/25" href={homeHref}>
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link className="transition hover:text-gray-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/25" href={yearHref}>
              {year.label}
            </Link>
            <span aria-hidden="true">/</span>
            <Link className="transition hover:text-gray-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/25" href={locationHref}>
              {locationLabel}
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-gray-950">{collection.title}</span>
          </nav>

          <header className="animated-reveal rounded-[2rem] border border-gray-900/10 bg-white/78 p-6 shadow-2xl shadow-gray-900/5 backdrop-blur-md sm:p-8" aria-labelledby="animated-collection-title" data-testid="animated-collection-shell">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-gray-600">Collection</p>
            <h1 id="animated-collection-title" className="font-serif text-5xl font-bold leading-none tracking-tight text-gray-950 sm:text-7xl">
              {collection.title}
            </h1>
            {collection.summary ? <p className="mt-5 max-w-3xl text-base leading-8 text-gray-700 sm:text-lg">{collection.summary}</p> : null}
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
            </p>
          </header>
        </div>

        <section className="relative left-1/2 mt-8 w-screen max-w-none -translate-x-1/2 px-4 sm:px-6 md:static md:mx-auto md:w-full md:max-w-7xl md:translate-x-0 md:rounded-[2rem] md:border md:border-gray-900/10 md:bg-white/72 md:p-7 md:shadow-2xl md:shadow-gray-900/5 md:backdrop-blur-md 2xl:max-w-[128rem]" aria-labelledby="animated-sequence-heading">
          <div className="mb-14 border-b border-gray-900/10 pb-5 md:mb-16">
            <h2 id="animated-sequence-heading" className="font-serif text-4xl font-semibold tracking-tight text-gray-950">Photos</h2>
          </div>
          {photos.length > 0 ? (
            <PhotoViewer photos={photos} collectionTitle={collection.title} singleScreen={false} />
          ) : (
            <div className="py-20 text-center text-gray-500" data-testid="empty-photos">
              Photos will appear here after upload.
            </div>
          )}
        </section>
      </div>

      <AnimatedArchiveStyles />
    </main>
  );
}
