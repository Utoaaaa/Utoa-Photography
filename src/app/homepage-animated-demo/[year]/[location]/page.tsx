import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DemoArchiveStyles } from '../../_components/DemoArchiveStyles';
import { buildDemoCollectionHref, getDemoLocation } from '../../demo-data';

type LocationDemoPageProps = {
  params: Promise<{
    year: string;
    location: string;
  }>;
};

export async function generateMetadata({ params }: LocationDemoPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const year = decodeURIComponent(resolvedParams.year);
  const locationSlug = decodeURIComponent(resolvedParams.location);
  const location = getDemoLocation(year, locationSlug);

  return {
    title: location ? `${location.name} Demo Collections | UTOA Photography` : 'Location Demo | UTOA Photography',
    description: 'Animated demo location page showing many photo collections under one place.',
    robots: { index: false, follow: false },
  };
}

function DemoCover({ className, label }: { className: string; label: string }) {
  return (
    <div className={`demo-cover-panel ${className}`} style={{ aspectRatio: '3 / 4', minHeight: 0 }} role="img" aria-label={label}>
      <div className="demo-cover-grid" aria-hidden="true" />
      <div className="demo-cover-flare" aria-hidden="true" />
    </div>
  );
}

export default async function LocationAnimatedDemoPage({ params }: LocationDemoPageProps) {
  const resolvedParams = await params;
  const year = decodeURIComponent(resolvedParams.year);
  const locationSlug = decodeURIComponent(resolvedParams.location);
  const location = getDemoLocation(year, locationSlug);

  if (!location) {
    notFound();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-6 py-8 text-foreground sm:px-8 md:px-12">
      <div className="pointer-events-none fixed inset-0 z-0 demo-exposure-field" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <nav className="mb-8 flex flex-wrap items-center gap-3 text-sm font-medium text-gray-600" aria-label="Demo breadcrumbs">
          <Link className="transition hover:text-gray-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/25" href="/homepage-animated-demo">
            Animated demo
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-gray-950">{location.name}</span>
        </nav>

        <section className="max-w-4xl" aria-labelledby="location-demo-title">
          <div className="demo-reveal">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-600">Location</p>
            <h1 id="location-demo-title" className="mt-4 font-serif text-5xl font-bold leading-none tracking-tight text-gray-950 sm:text-7xl">
              {location.name}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-gray-700 sm:text-lg">{location.summary}</p>
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-gray-900/10 bg-white/78 p-5 shadow-2xl shadow-gray-900/5 backdrop-blur-md sm:p-7" aria-labelledby="collections-heading">
          <div className="mb-6 flex flex-col justify-between gap-4 border-b border-gray-900/10 pb-6 md:flex-row md:items-end">
            <div>
              <h2 id="collections-heading" className="font-serif text-4xl font-semibold tracking-tight text-gray-950">Collections</h2>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {location.collections.map((collection, index) => (
              <Link
                key={collection.id}
                href={buildDemoCollectionHref(location.year, location.slug, collection.slug)}
                prefetch={false}
                className="demo-location-card demo-reveal group block rounded-[1.8rem] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/25 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
                style={{ animationDelay: `${180 + index * 90}ms` }}
              >
                <article className="h-full overflow-hidden rounded-[1.8rem] border border-gray-900/10 bg-white shadow-sm transition duration-500 group-hover:-translate-y-2 group-hover:shadow-2xl group-focus-visible:-translate-y-2 group-focus-visible:shadow-2xl">
                  <div className="m-4 overflow-hidden rounded-[1.45rem]">
                    <DemoCover className={collection.coverClassName} label={`${collection.title} collection cover visual`} />
                  </div>
                  <div className="px-6 pb-6 pt-1">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">{collection.capturedAt}</p>
                    <h3 className="mt-2 font-serif text-3xl font-semibold leading-none text-gray-950">{collection.title}</h3>
                    {collection.summary ? <p className="mt-4 text-sm leading-7 text-gray-700 sm:text-base">{collection.summary}</p> : null}
                    <p className="mt-4 text-sm font-semibold text-gray-500">{collection.photos.length} photos</p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <DemoArchiveStyles />
    </main>
  );
}
