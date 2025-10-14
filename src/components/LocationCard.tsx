'use client';

import Link from 'next/link';
import clsx from 'clsx';

import type { LocationEntry } from '@/lib/year-location';

interface LocationCardProps {
  yearLabel: string;
  location: LocationEntry;
}

export function LocationCard({ yearLabel, location }: LocationCardProps) {
  const href = `/${encodeURIComponent(yearLabel)}/${encodeURIComponent(location.slug)}`;
  const lastUpdated = location.collections.reduce<string | null>((latest, collection) => {
    const candidate = collection.updatedAt ?? collection.publishedAt;
    if (!candidate) return latest;
    if (!latest || new Date(candidate).getTime() > new Date(latest).getTime()) {
      return candidate;
    }
    return latest;
  }, null);

  return (
    <article
      className="group flex flex-col justify-between rounded-xl border border-gray-200 bg-white/70 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-within:-translate-y-1 focus-within:shadow-lg"
      data-testid="location-card"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-2xl font-semibold tracking-tight text-gray-900 group-hover:text-gray-700">
            {location.name}
          </h3>
          <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white">
            {location.collectionCount} {location.collectionCount === 1 ? 'Collection' : 'Collections'}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-gray-600">
          {location.summary ?? 'Stay tuned—new stories from this location are coming soon.'}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Link
          href={href}
          className={clsx(
            'inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition',
            'hover:border-gray-900 hover:bg-gray-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2'
          )}
        >
          查看作品
          <span aria-hidden="true" className="text-base">
            →
          </span>
        </Link>
        <div className="text-xs text-gray-400">
          {lastUpdated ? `更新於 ${new Date(lastUpdated).toLocaleDateString()}` : '尚無作品集更新'}
        </div>
      </div>
    </article>
  );
}
