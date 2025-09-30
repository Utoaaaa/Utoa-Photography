'use client';

import { useEffect, useState } from 'react';
import { PhotoViewer } from '../../../../components/ui/PhotoViewer';
import { Breadcrumb } from '../../../../components/ui/Breadcrumb';

interface Props {
  yearLabel: string;
  collectionSlug: string;
}

export default function ClientCollectionViewer({ yearLabel, collectionSlug }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    year: { id: string; label: string };
    collection: { id: string; slug: string; title: string; summary: string | null };
    photos: { id: string; alt: string; caption: string | null; width: number; height: number }[];
  } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    async function fetchWithRetry(attempt = 1): Promise<void> {
      try {
        const res = await fetch(`/api/view/collection?year=${encodeURIComponent(yearLabel)}&slug=${encodeURIComponent(collectionSlug)}`, { cache: 'no-store' });
        if (!res.ok) {
          if (attempt < 5 && (res.status === 404 || res.status === 409 || res.status === 425)) {
            await new Promise(r => setTimeout(r, 200 * attempt));
            return fetchWithRetry(attempt + 1);
          }
          throw new Error(`Failed to load collection (${res.status})`);
        }
        const text = await res.text();
        let json: any = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch (e) {
          throw new Error('Invalid JSON response');
        }
        if (!active) return;
        setData(json);
        setLoading(false);
      } catch (e: any) {
        if (!active) return;
        if (attempt < 5) {
          await new Promise(r => setTimeout(r, 200 * attempt));
          return fetchWithRetry(attempt + 1);
        }
        setError(e?.message || 'Failed to load');
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
