"use client";

import clsx from 'clsx';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { LocationCollectionSummary } from '@/lib/year-location';
import { getR2VariantDirectUrl } from '@/lib/images';
import { useAutoShrinkText } from '@/hooks/useAutoShrinkText';

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

export function CollectionGrid({ yearLabel, locationSlug, collections }: CollectionGridProps) {
  if (collections.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3" data-testid="collection-grid">
      {collections.map((collection) => (
        <CollectionCard
          key={collection.id}
          yearLabel={yearLabel}
          locationSlug={locationSlug}
          collection={collection}
        />
      ))}
    </div>
  );
}

interface CollectionCardProps {
  yearLabel: string;
  locationSlug: string;
  collection: LocationCollectionSummary;
}

function formatCollectionDate(collection: LocationCollectionSummary): string | null {
  const timestamp = collection.updatedAt ?? collection.publishedAt;
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

function CollectionCard({ yearLabel, locationSlug, collection }: CollectionCardProps) {
  const href = buildCollectionHref(yearLabel, locationSlug, collection.slug);
  const [revealed, setRevealed] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const coverImageSrc = useMemo(() => {
    if (!collection.coverAssetId) return null;
    return getR2VariantDirectUrl(collection.coverAssetId, 'medium');
  }, [collection.coverAssetId]);

  const coverOrientation = useMemo<'portrait' | 'landscape'>(() => {
    const width = collection.coverAssetWidth ?? null;
    const height = collection.coverAssetHeight ?? null;
    if (!width || !height || width === height) return 'landscape';
    return width < height ? 'portrait' : 'landscape';
  }, [collection.coverAssetWidth, collection.coverAssetHeight]);

  const imageWrapperClass = useMemo(
    () =>
      clsx(
        // Revert to original container ratio while keeping object-cover behavior for consistent cropping
        'relative aspect-[3/4] overflow-hidden rounded-[2rem]',
        coverOrientation === 'portrait'
          ? 'bg-white/80 dark:bg-gray-900/50'
          : undefined,
      ),
    [coverOrientation],
  );

  // Always cover: portrait fills width (crop top/bottom), landscape fills height (crop sides), centered.
  const imageClass = 'object-cover object-center';

  const formattedDate = useMemo(() => formatCollectionDate(collection), [collection]);

  const summary = collection.summary ?? '';

  useAutoShrinkText(titleRef, { minFontSize: 28 }, [collection.title]);

  return (
    <Link
      href={href}
      aria-label={`${collection.title}：查看作品`}
      className="group block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/30 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
      data-testid="collection-card"
    >
      <article
        ref={cardRef}
        className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white/85 shadow-sm transition-transform duration-500 ease-out hover:-translate-y-2 hover:shadow-2xl focus-visible:-translate-y-2 focus-visible:shadow-2xl"
      >
        <div className="relative m-5 overflow-hidden rounded-[2rem]">
          <div className={imageWrapperClass}>
            {coverImageSrc ? (
              <img
                src={coverImageSrc}
                alt={`${collection.title} 封面視覺`}
                className={`h-full w-full ${imageClass}`}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[#01AFF6]/60 via-[#F20085]/45 to-[#FFD036]/65" />
            )}

            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.45),_rgba(0,0,0,0.1)_60%,_rgba(0,0,0,0.6))] mix-blend-multiply" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/45" />

            <div className="absolute inset-0 flex flex-col justify-between px-8 py-10 text-white">
              <span
                className={clsx(
                  'inline-flex items-center gap-2 text-[0.58rem] font-semibold uppercase tracking-[0.32em] sm:text-[0.65rem]',
                  'text-white/80 transition-all duration-700 ease-out',
                  revealed ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
                )}
              >
                {yearLabel}
              </span>

              <h3
                ref={titleRef}
                className={clsx(
                  'font-serif text-[2.4rem] font-semibold uppercase leading-[0.94] tracking-tight drop-shadow-md sm:text-[2.9rem] md:text-[3.1rem]',
                  'transition-all duration-700 ease-out',
                  revealed ? 'translate-y-0 opacity-100 delay-100' : 'translate-y-8 opacity-0'
                )}
              >
                {collection.title}
              </h3>
            </div>
          </div>
        </div>

        <div
          className={clsx(
            'mt-auto flex flex-col gap-6 px-7 pb-8 text-left transition-all duration-700 ease-out',
            revealed ? 'translate-y-0 opacity-100 delay-150' : 'translate-y-6 opacity-0'
          )}
        >
          <div className="flex flex-col gap-5 border-t border-gray-200 pt-5 sm:flex-row sm:items-end sm:justify-between">
            <p
              className="text-sm leading-relaxed text-gray-600 sm:max-w-[65%] sm:text-[0.95rem]"
              style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
            >
              {summary}
            </p>
            <div className="whitespace-nowrap text-right text-[0.72rem] font-medium uppercase tracking-[0.32em] text-gray-900/80 sm:text-[0.78rem]">
              {formattedDate ?? '尚未公布'}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
