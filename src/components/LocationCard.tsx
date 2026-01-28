'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { LocationEntry } from '@/lib/year-location';
import { getR2VariantDirectUrl, generateSrcSet } from '@/lib/images';
import { useAutoShrinkText } from '@/hooks/useAutoShrinkText';

interface LocationCardProps {
  yearLabel: string;
  location: LocationEntry;
}

export function LocationCard({ yearLabel, location }: LocationCardProps) {
  const href = `/${encodeURIComponent(yearLabel)}/${encodeURIComponent(location.slug)}`;

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

  const posterImage = useMemo(() => {
    if (!location.coverAssetId) return null;
    return getR2VariantDirectUrl(location.coverAssetId, 'medium');
  }, [location.coverAssetId]);

  const posterSrcSet = useMemo(() => {
    if (!location.coverAssetId) return '';
    return generateSrcSet(location.coverAssetId);
  }, [location.coverAssetId]);

  const lastUpdated = useMemo(() => {
    return location.collections.reduce<string | null>((oldest, collection) => {
      const candidate = collection.updatedAt ?? collection.publishedAt;
      if (!candidate) return oldest;
      if (!oldest || new Date(candidate).getTime() < new Date(oldest).getTime()) {
        return candidate;
      }
      return oldest;
    }, null);
  }, [location.collections]);

  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return null;
    const date = new Date(lastUpdated);
    if (Number.isNaN(date.getTime())) return null;
    // Use UTC getters to ensure deterministic SSR/CSR rendering.
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }, [lastUpdated]);

  const summary = location.summary ?? '';
  useAutoShrinkText(titleRef, { minFontSize: 34 }, [location.name]);

  return (
    <Link
      href={href}
      aria-label={`${location.name}：查看作品`}
      className="group block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/30 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
      data-testid="location-card"
    >
      <article
        ref={cardRef}
        className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white/85 shadow-sm transition-transform duration-500 ease-out hover:-translate-y-2 hover:shadow-2xl focus-visible:-translate-y-2 focus-visible:shadow-2xl"
      >
        <div className="relative m-5 overflow-hidden rounded-[2rem]">
          {/* Revert to original portrait container; keep object-cover for cropping behavior */}
          <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem]">
            {posterImage ? (
              <>
                <img
                  src={posterImage}
                  srcSet={posterSrcSet}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  alt={`${location.name} 封面視覺`}
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                  decoding="async"
                />
              </>
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
                  'font-serif text-[2.8rem] font-semibold uppercase leading-[0.92] tracking-tight drop-shadow-md sm:text-[3.4rem] md:text-[3.75rem]',
                  'transition-all duration-700 ease-out',
                  revealed ? 'translate-y-0 opacity-100 delay-100' : 'translate-y-8 opacity-0'
                )}
              >
                {location.name}
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
              {formattedLastUpdated ?? ''}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
