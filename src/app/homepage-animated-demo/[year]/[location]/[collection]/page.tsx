import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DemoArchiveStyles } from '../../../_components/DemoArchiveStyles';
import { buildDemoLocationHref, getDemoCollection, type DemoPhoto } from '../../../demo-data';

type CollectionDemoPageProps = {
  params: Promise<{
    year: string;
    location: string;
    collection: string;
  }>;
};

export async function generateMetadata({ params }: CollectionDemoPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const year = decodeURIComponent(resolvedParams.year);
  const locationSlug = decodeURIComponent(resolvedParams.location);
  const collectionSlug = decodeURIComponent(resolvedParams.collection);
  const result = getDemoCollection(year, locationSlug, collectionSlug);

  return {
    title: result ? `${result.collection.title} Demo Sequence | UTOA Photography` : 'Collection Demo | UTOA Photography',
    description: 'Animated demo collection page showing a cinematic photo sequence.',
    robots: { index: false, follow: false },
  };
}

function PhotoFrame({ photo, index }: { photo: DemoPhoto; index: number }) {
  const photoRatio = photo.width / photo.height;

  return (
    <figure className="demo-reveal flex min-h-[88vh] w-full flex-col items-center justify-center py-20 first:pt-16 md:py-24" style={{ animationDelay: `${160 + index * 90}ms` }}>
      <div className="relative flex w-full flex-col items-center">
        <div className="relative flex w-full justify-center">
          <div className="relative mx-auto h-auto max-h-[92vh] w-full max-w-[140rem] px-2 sm:px-4">
            <div
              className={`demo-cover-panel mx-auto min-h-0 overflow-hidden ${photo.coverClassName}`}
              style={{ aspectRatio: `${photo.width} / ${photo.height}`, width: `min(100%, calc(92vh * ${photoRatio}))` }}
              role="img"
              aria-label={`${photo.title} demo photo frame`}
            >
              <div className="demo-cover-grid" aria-hidden="true" />
              <div className="demo-cover-flare" aria-hidden="true" />
            </div>
          </div>
        </div>
        {photo.caption ? (
          <figcaption className="mx-auto mt-6 max-w-3xl text-center text-sm leading-6 text-gray-600 md:text-base">
            {photo.caption}
          </figcaption>
        ) : null}
      </div>
    </figure>
  );
}

export default async function CollectionAnimatedDemoPage({ params }: CollectionDemoPageProps) {
  const resolvedParams = await params;
  const year = decodeURIComponent(resolvedParams.year);
  const locationSlug = decodeURIComponent(resolvedParams.location);
  const collectionSlug = decodeURIComponent(resolvedParams.collection);
  const result = getDemoCollection(year, locationSlug, collectionSlug);

  if (!result) {
    notFound();
  }

  const { location, collection } = result;

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-6 py-8 text-foreground sm:px-8 md:px-12">
      <div className="pointer-events-none fixed inset-0 z-0 demo-exposure-field" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <nav className="mb-8 flex flex-wrap items-center gap-3 text-sm font-medium text-gray-600" aria-label="Demo breadcrumbs">
          <Link className="transition hover:text-gray-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/25" href="/homepage-animated-demo">
            Animated demo
          </Link>
          <span aria-hidden="true">/</span>
          <Link className="transition hover:text-gray-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/25" href={buildDemoLocationHref(location.year, location.slug)}>
            {location.name}
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-gray-950">{collection.title}</span>
        </nav>

        <header className="demo-reveal rounded-[2rem] border border-gray-900/10 bg-white/78 p-6 shadow-2xl shadow-gray-900/5 backdrop-blur-md sm:p-8" aria-labelledby="collection-demo-title">
          <h1 id="collection-demo-title" className="font-serif text-5xl font-bold leading-none tracking-tight text-gray-950 sm:text-7xl">
            {collection.title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-gray-700 sm:text-lg">{collection.summary}</p>
        </header>

        <section className="mt-8 rounded-[2rem] border border-gray-900/10 bg-white/72 p-5 shadow-2xl shadow-gray-900/5 backdrop-blur-md sm:p-7" aria-labelledby="sequence-heading">
          <div className="mb-6 border-b border-gray-900/10 pb-5">
            <h2 id="sequence-heading" className="font-serif text-4xl font-semibold tracking-tight text-gray-950">Photos</h2>
          </div>
          <div className="space-y-8 sm:space-y-10">
            {collection.photos.map((photo, index) => (
              <PhotoFrame key={photo.id} photo={photo} index={index} />
            ))}
          </div>
        </section>
      </div>

      <DemoArchiveStyles />
    </main>
  );
}
