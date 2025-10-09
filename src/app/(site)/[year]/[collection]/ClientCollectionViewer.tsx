'use client';

import { useEffect, useState } from 'react';
import { PhotoViewer } from '../../../../components/ui/PhotoViewer';
import { Breadcrumb } from '../../../../components/ui/Breadcrumb';

interface Props {
  yearLabel: string;
  collectionSlug: string;
}

type YearSummary = { id: string; label: string };
type CollectionSummary = { id: string; slug: string; title: string; summary: string | null };
type PhotoSummary = { id: string; alt: string; caption: string | null; width: number; height: number };

type CollectionPayload = {
  year: YearSummary;
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
  const collection = obj.collection as Record<string, unknown> | undefined;
  const photos = obj.photos;

  const validYear =
    typeof year === 'object' &&
    year !== null &&
    typeof year.id === 'string' &&
    typeof year.label === 'string';

  const validCollection =
    typeof collection === 'object' &&
    collection !== null &&
    typeof collection.id === 'string' &&
    typeof collection.slug === 'string' &&
    typeof collection.title === 'string' &&
    (typeof collection.summary === 'string' || collection.summary === null);

  const validPhotos = Array.isArray(photos) && photos.every(isPhotoSummary);

  return Boolean(validYear && validCollection && validPhotos);
}

export default function ClientCollectionViewer({ yearLabel, collectionSlug }: Props) {
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
    return () => { active = false; };
  }, [yearLabel, collectionSlug]);

  const content = (() => {
    if (loading) {
      return <div data-testid="photo-viewer-loading" className="py-24 text-center text-gray-500">Loading…</div>;
    }
    if (error || !data) {
      return <div data-testid="photo-viewer-error" className="py-24 text-center text-red-500">{error || 'Error'}</div>;
    }
    const { year, collection, photos } = data;
    return (
      <>
        <header className="border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <Breadcrumb 
                items={[
                  { label: 'UTOA', href: '/' },
                  { label: year.label, href: `/${year.label}` },
                  { label: collection.title, href: `/${year.label}/${collection.slug}` }
                ]}
              />
              <div className="mt-6">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-extralight tracking-wide text-gray-900">
                  {collection.title}
                </h1>
                {collection.summary && (
                  <p className="mt-4 text-gray-600 text-lg max-w-3xl">{collection.summary}</p>
                )}
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24" data-testid="empty-photos">
              <div className="text-center">
                <h2 className="text-xl font-light text-gray-900 mb-2">No photos yet</h2>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            {/* Wrapper renders; inner content injected below */}
          </div>
        </div>
      </header>
      {content}
    </div>
  );
}
