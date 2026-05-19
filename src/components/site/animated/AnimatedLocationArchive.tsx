import Link from 'next/link';

import { buildCollectionHref, buildHomeHref, buildYearHref } from '@/lib/site-paths';
import type { LocationEntry, YearEntry } from '@/lib/year-location';

import { AnimatedArchiveStyles } from './AnimatedArchiveStyles';
import { AnimatedCover } from './AnimatedCover';

function formatDate(timestamp: string | null) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

interface AnimatedLocationArchiveProps {
  year: Pick<YearEntry, 'id' | 'label'>;
  location: LocationEntry;
  homeHref?: string;
}

export function AnimatedLocationArchive({ year, location, homeHref = buildHomeHref() }: AnimatedLocationArchiveProps) {
  const yearHref = buildYearHref(year.label);

  return (
    <main className="animated-archive-home relative min-h-screen overflow-hidden bg-background px-6 py-8 text-foreground sm:px-8 md:px-12">
      <div className="pointer-events-none fixed inset-0 z-0 animated-exposure-field" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <nav className="mb-8 flex flex-wrap items-center gap-3 text-sm font-medium text-gray-600" aria-label="Breadcrumbs">
          <Link className="transition hover:text-gray-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/25" href={homeHref}>
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link className="transition hover:text-gray-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/25" href={yearHref}>
            {year.label}
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-gray-950">{location.name}</span>
        </nav>

        <section className="max-w-4xl" aria-labelledby="animated-location-title">
          <div className="animated-reveal">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-600">Location</p>
            <h1 id="animated-location-title" className="mt-4 font-serif text-5xl font-bold leading-none tracking-tight text-gray-950 sm:text-7xl">
              {location.name}
            </h1>
            {location.summary ? <p className="mt-5 max-w-2xl text-base leading-8 text-gray-700 sm:text-lg">{location.summary}</p> : null}
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-gray-900/10 bg-white/78 p-5 shadow-2xl shadow-gray-900/5 backdrop-blur-md sm:p-7" aria-labelledby="animated-collections-heading" data-testid="animated-location-collections">
          <div className="mb-6 flex flex-col justify-between gap-4 border-b border-gray-900/10 pb-6 md:flex-row md:items-end">
            <h2 id="animated-collections-heading" className="font-serif text-4xl font-semibold tracking-tight text-gray-950">Collections</h2>
          </div>

          {location.collections.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {location.collections.map((collection, index) => {
                const capturedAt = formatDate(collection.capturedAt);
                const photoCountLabel = `${collection.photoCount} ${collection.photoCount === 1 ? 'photo' : 'photos'}`;
                return (
                  <Link
                    key={collection.id}
                    href={buildCollectionHref(year.label, location.slug, collection.slug)}
                    className="animated-location-card animated-reveal group block rounded-[1.8rem] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/25 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
                    style={{ animationDelay: `${180 + index * 90}ms` }}
                    data-testid="animated-collection-card"
                  >
                    <article className="h-full overflow-hidden rounded-[1.8rem] border border-gray-900/10 bg-white shadow-sm transition duration-500 group-hover:-translate-y-2 group-hover:shadow-2xl group-focus-visible:-translate-y-2 group-focus-visible:shadow-2xl">
                      <div className="m-4 overflow-hidden rounded-[1.45rem]">
                        <AnimatedCover
                          assetId={collection.coverAssetId}
                          alt={`${collection.title} collection cover visual`}
                          width={collection.coverAssetWidth}
                          height={collection.coverAssetHeight}
                          priority={index === 0}
                          seed={`${year.label}-${location.slug}-${collection.slug}-${collection.title}`}
                        />
                      </div>
                      <div className="px-6 pb-6 pt-1">
                        {capturedAt ? <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">{capturedAt}</p> : null}
                        <h3 className="mt-2 font-serif text-3xl font-semibold leading-none text-gray-950">{collection.title}</h3>
                        {collection.summary ? <p className="mt-4 text-sm leading-7 text-gray-700 sm:text-base">{collection.summary}</p> : null}
                        <p className="mt-4 text-sm font-semibold text-gray-500">{photoCountLabel}</p>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.6rem] border border-dashed border-gray-900/15 bg-white/60 p-10 text-center text-gray-500" data-testid="animated-empty-collections">
              Collections will appear here after publication.
            </div>
          )}
        </section>
      </div>

      <AnimatedArchiveStyles />
    </main>
  );
}
