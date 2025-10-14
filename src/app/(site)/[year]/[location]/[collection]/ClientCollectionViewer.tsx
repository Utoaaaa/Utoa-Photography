'use client';

import { useEffect, useState } from 'react';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { PhotoViewer } from '@/components/ui/PhotoViewer';

interface Props {
  yearLabel: string;
  locationSlug: string;
  collectionSlug: string;
}

type YearSummary = { id: string; label: string };
type LocationSummary = { id: string; slug: string; name: string; summary: string | null };
type CollectionSummary = { id: string; slug: string; title: string; summary: string | null };
type PhotoSummary = { id: string; alt: string; caption: string | null; width: number; height: number };

type CollectionPayload = {
  year: YearSummary;
  location: LocationSummary | null;
  collection: CollectionSummary;
  photos: PhotoSummary[];
};

function isPhotoSummary(value: unknown): value is PhotoSummary {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { alt?: unknown }).alt === 'string' &&
    (typeof (value as { caption?: unknown }).caption === 'string' || (value as { caption?: unknown }).caption === null) &&
    typeof (value as { width?: unknown }).width === 'number' &&
    typeof (value as { height?: unknown }).height === 'number'
  );
}

function isCollectionPayload(value: unknown): value is CollectionPayload {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  const year = obj.year as Record<string, unknown> | undefined;
  const location = obj.location as Record<string, unknown> | null | undefined;
  const collection = obj.collection as Record<string, unknown> | undefined;
  const photos = obj.photos;

  const validYear =
    typeof year === 'object' &&
    year !== null &&
    typeof year.id === 'string' &&
    typeof year.label === 'string';

  const validLocation =
    location === null ||
    (typeof location === 'object' &&
      location !== null &&
      typeof location.id === 'string' &&
      typeof location.slug === 'string' &&
      typeof location.name === 'string' &&
      (typeof location.summary === 'string' || location.summary === null));

  const validCollection =
    typeof collection === 'object' &&
    collection !== null &&
    typeof collection.id === 'string' &&
    typeof collection.slug === 'string' &&
    typeof collection.title === 'string' &&
    (typeof collection.summary === 'string' || collection.summary === null);

  const validPhotos = Array.isArray(photos) && photos.every(isPhotoSummary);

  return Boolean(validYear && validLocation && validCollection && validPhotos);
}

export default function ClientCollectionViewer({ yearLabel, locationSlug, collectionSlug }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CollectionPayload | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    async function delay(ms: number) {
      await new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    }

    async function fetchWithRetry(attempt: number = 1): Promise<void> {
      try {
        const res = await fetch(`/api/view/collection?year=${encodeURIComponent(yearLabel)}&slug=${encodeURIComponent(collectionSlug)}`, { cache: 'no-store' });
        if (!res.ok) {
          if (attempt < 5 && (res.status === 404 || res.status === 409 || res.status === 425)) {
            await delay(200 * attempt);
            return fetchWithRetry(attempt + 1);
          }
          throw new Error(`Failed to load collection (${res.status})`);
        }
        const text = await res.text();
        let json: unknown = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          throw new Error('Invalid JSON response');
        }
        if (!active) return;
        if (isCollectionPayload(json)) {
          setData(json);
        } else {
          throw new Error('Unexpected payload shape');
        }
        setLoading(false);
      } catch (e: unknown) {
        if (!active) return;
        if (attempt < 5) {
          await delay(200 * attempt);
          return fetchWithRetry(attempt + 1);
        }
        const message = e instanceof Error ? e.message : 'Failed to load';
        setError(message);
        setLoading(false);
      }
    }

    fetchWithRetry();
    return () => {
      active = false;
    };
  }, [yearLabel, collectionSlug]);

  const content = (() => {
    if (loading) {
      return <div data-testid="photo-viewer-loading" className="py-24 text-center text-gray-500">Loading…</div>;
    }
    if (error || !data) {
      return <div data-testid="photo-viewer-error" className="py-24 text-center text-red-500">{error || 'Error'}</div>;
    }
    const { year, location, collection, photos } = data;
    const anchorSafeYear = year.label.replace(/\s+/g, '-');
    const yearHref = `/#year-${encodeURIComponent(anchorSafeYear)}`;
    const resolvedLocationSlug = location?.slug ?? locationSlug;
    const locationLabel = location?.name ?? '未指派地點';
    const locationHref = resolvedLocationSlug
      ? `/${encodeURIComponent(year.label)}/${encodeURIComponent(resolvedLocationSlug)}`
      : yearHref;
    const breadcrumbItems = [
      { label: 'Home', href: '/' },
      { label: year.label, href: yearHref },
    ];

    breadcrumbItems.push({ label: locationLabel, href: locationHref });

    breadcrumbItems.push({
      label: collection.title,
      href: resolvedLocationSlug
        ? `/${encodeURIComponent(year.label)}/${encodeURIComponent(resolvedLocationSlug)}/${encodeURIComponent(collection.slug)}`
        : `/${encodeURIComponent(year.label)}/${encodeURIComponent(collection.slug)}`,
    });

    return (
      <>
        <header className="border-b border-gray-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <Breadcrumb items={breadcrumbItems} />
              <div className="mt-6">
                <h1 className="text-3xl font-extralight tracking-wide text-gray-900 md:text-4xl lg:text-5xl">{collection.title}</h1>
                {collection.summary && <p className="mt-4 max-w-3xl text-lg text-gray-600">{collection.summary}</p>}
                <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
                  <span>
                    {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main>
          {photos.length > 0 ? (
            <PhotoViewer photos={photos} collectionTitle={collection.title} singleScreen={false} />
          ) : (
            <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8" data-testid="empty-photos">
              <div className="text-center">
                <h2 className="mb-2 text-xl font-light text-gray-900">No photos yet</h2>
                <p className="text-gray-500">Photos will appear after upload.</p>
              </div>
            </div>
          )}
        </main>
      </>
    );
  })();

  return (
    <div data-testid="photo-viewer-container">
      <header className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Wrapper renders; inner content injected below */}
        </div>
      </header>
      {content}
    </div>
  );
}
