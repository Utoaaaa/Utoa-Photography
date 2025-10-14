import Link from 'next/link';
import Image from 'next/image';

import type { LocationCollectionSummary } from '@/lib/year-location';

interface CollectionGridProps {
  yearLabel: string;
  locationSlug: string;
  collections: LocationCollectionSummary[];
}

function buildCollectionHref(yearLabel: string, locationSlug: string, collectionSlug: string) {
  const yearPath = encodeURIComponent(yearLabel);
  const locationPath = encodeURIComponent(locationSlug);
  const collectionPath = encodeURIComponent(collectionSlug);
  return `/${yearPath}/${locationPath}/${collectionPath}`;
}

function resolveDisplayDate(collection: LocationCollectionSummary) {
  let lastTimestamp: string | null = null;

  if (collection.updatedAt) {
    lastTimestamp = collection.updatedAt;
  } else if (collection.publishedAt) {
    lastTimestamp = collection.publishedAt;
  }

  if (!lastTimestamp) {
    return { iso: null, label: null };
  }

  const parsed = new Date(lastTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return { iso: null, label: null };
  }

  const formatter = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return { iso: parsed.toISOString(), label: formatter.format(parsed) };
}

function renderCover(collection: LocationCollectionSummary) {
  if (collection.coverAssetId) {
    const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
    if (accountHash) {
      const src = `https://imagedelivery.net/${accountHash}/${collection.coverAssetId}/cover`;
      return (
        <Image
          src={src}
          alt={collection.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      );
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-100">
      <div className="flex h-12 w-16 items-center justify-center rounded-sm border-2 border-gray-300">
        <div className="h-8 w-8 rounded-full border border-gray-300 bg-white" />
      </div>
    </div>
  );
}

export function CollectionGrid({ yearLabel, locationSlug, collections }: CollectionGridProps) {
  if (collections.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3" data-testid="collection-grid">
      {collections.map((collection) => {
        const href = buildCollectionHref(yearLabel, locationSlug, collection.slug);
        const { iso, label } = resolveDisplayDate(collection);

        return (
          <article
            key={collection.id}
            className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-within:-translate-y-1 focus-within:shadow-lg"
            data-testid="collection-card"
          >
            <div className="relative aspect-[4/3] overflow-hidden">{renderCover(collection)}</div>

            <div className="flex grow flex-col gap-6 p-6">
              <div className="space-y-3">
                <h2 className="font-serif text-2xl font-semibold tracking-tight text-gray-900 group-hover:text-gray-700">
                  {collection.title}
                </h2>
                <p className="text-sm leading-relaxed text-gray-600">
                  {collection.summary ?? '敬請期待更多來自這個地點的作品故事。'}
                </p>
              </div>

              <div className="mt-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                {label ? (
                  <time className="text-xs text-gray-400" dateTime={iso ?? undefined}>
                    更新於 {label}
                  </time>
                ) : (
                  <span className="text-xs text-gray-400">尚無更新紀錄</span>
                )}

                <Link
                  href={href}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:border-gray-900 hover:bg-gray-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
                >
                  查看作品
                  <span aria-hidden="true" className="text-base">
                    →
                  </span>
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
