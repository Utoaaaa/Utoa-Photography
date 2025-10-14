'use client';

import { useState, useEffect, useCallback } from 'react';
import { CollectionsList } from '@/components/admin/CollectionsList';
import { CollectionPreview } from '@/components/admin/CollectionPreview';
import { PublishingFilters } from '@/components/admin/PublishingFilters';
import AdminPageLayout from '@/components/admin/AdminPageLayout';

interface CollectionSummary {
  id: string;
  title: string;
  year: number;
  draftCount: number;
  checklistStatus: 'pass' | 'pending';
  slug: string;
  status: 'draft' | 'published';
  version: number;
  lastPublishedAt: string | null;
  updatedAt: string;
  // Additional fields for compatibility with CollectionPreview
  description?: string | null;
  publishingStatus?: 'draft' | 'published' | null;
  publishedAt?: Date | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  assets?: { id: string; cloudflareId: string; alt: string; filename: string; }[];
  locationId?: string | null;
  locationName?: string | null;
}

interface Filters {
  year?: string;
  status?: 'draft' | 'published';
  checklistStatus?: 'pass' | 'pending';
}

// T028: Admin publishing page with collection list and filters
export default function PublishingPage() {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Safe JSON parsing to avoid flakiness when server briefly returns HTML/empty
  async function safeJson<T = any>(res: Response, fallback: T): Promise<T> {
    try {
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.includes('application/json')) return fallback;
      const text = await res.text();
      if (!text) return fallback;
      return JSON.parse(text) as T;
    } catch {
      return fallback;
    }
  }

  // Minimal retry to smooth over transient dev/E2E races
  async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit, retries = 2, backoffMs = 200): Promise<Response> {
    let lastErr: unknown = null;
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await fetch(input, init);
        if (res.ok) return res;
        lastErr = new Error(`HTTP ${res.status}`);
      } catch (e) {
        lastErr = e;
      }
      if (i < retries) await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
    }
    throw lastErr instanceof Error ? lastErr : new Error('Fetch failed');
  }

  // Load collections with filters
  const loadCollections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      
      if (filters.year) params.append('year', filters.year);
      if (filters.status) params.append('status', filters.status);
      
      // Always include limit and offset for API compatibility
      params.append('limit', '50');
      params.append('offset', '0');
      
      const response = await fetchWithRetry(`/api/publishing/collections?${params}`, { cache: 'no-store' });

      const result = await safeJson<{ success: boolean; data: CollectionSummary[]; error?: string }>(response, { success: false, data: [] });
      if (!response.ok || !result.success) {
        throw new Error(result?.error || '載入作品集列表失敗');
      }
      
      let filteredCollections = result.data || [];
      
      // Client-side filtering for checklist status
      if (filters.checklistStatus) {
        filteredCollections = filteredCollections.filter(
          (c: CollectionSummary) => c.checklistStatus === filters.checklistStatus
        );
      }
      
  setCollections(filteredCollections);
      
      // Auto-select first collection if none selected
      if (!selectedCollection && filteredCollections.length > 0) {
        setSelectedCollection(filteredCollections[0].id);
      }
      
    } catch (err) {
      console.error('Error loading collections:', err);
  setError('載入作品集列表時發生錯誤，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }, [filters, selectedCollection]);

  // Load collections on mount and filter changes
  useEffect(() => {
    loadCollections();
  }, [filters, loadCollections]);

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setSelectedCollection(null); // Reset selection when filters change
  };

  const handleCollectionSelect = (collectionId: string) => {
    setSelectedCollection(collectionId);
  };

  const handleCollectionUpdate = async (_updates: Partial<{ id: string; title: string; }>) => {
    // Reload collections after update
    await loadCollections();
  };

  const handleCollectionRefresh = () => {
    // For CollectionsList refresh
    loadCollections();
  };

  const handlePublish = async (collectionId: string) => {
    try {
      const response = await fetch(`/api/publishing/collections/${collectionId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const result = await safeJson<{ message?: string; error?: string; details?: string[] }>(response, {} as any);

      if (!response.ok) {
        const errorMessage = Array.isArray(result?.details) && result.details.length > 0
          ? result.details.join('\n')
          : result?.message || result?.error || '發布失敗，請稍後再試';
        alert(errorMessage);
        return;
      }

      console.info('Collection published:', collectionId, result?.message);
      await loadCollections();
    } catch (error) {
      console.error('Failed to publish collection:', error);
      alert('發布失敗，請稍後再試');
    }
  };

  const handleUnpublish = async (collectionId: string) => {
    try {
      const response = await fetch(`/api/publishing/collections/${collectionId}/unpublish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const result = await safeJson<{ message?: string; error?: string; details?: string[] }>(response, {} as any);

      if (!response.ok) {
        const errorMessage = Array.isArray(result?.details) && result.details.length > 0
          ? result.details.join('\n')
          : result?.message || result?.error || '取消發布失敗，請稍後再試';
        alert(errorMessage);
        return;
      }

      console.info('Collection unpublished:', collectionId, result?.message);
      await loadCollections();
    } catch (error) {
      console.error('Failed to unpublish collection:', error);
      alert('取消發布失敗，請稍後再試');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/80">
      <AdminPageLayout
        breadcrumbItems={[{ label: '作品集發布' }]}
        title="作品集發布"
        description="管理作品集的發布狀態、SEO 設定與版本歷程。"
        contentClassName="grid gap-6 lg:grid-cols-[minmax(320px,360px)_1fr] lg:items-start"
        dataTestId="admin-publishing-page"
      >
        <section className="flex min-h-[480px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-sm ring-1 ring-gray-100/60">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700">作品集列表</h2>
            <p className="text-xs text-gray-500">篩選並選擇需要發布或維護的作品集。</p>
          </div>

          <div className="border-b border-gray-100 px-5 py-4">
            <PublishingFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              totalCollections={collections.length}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" aria-label="載入中" />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700">
                <p>{error}</p>
                <button
                  onClick={loadCollections}
                  className="mt-2 inline-flex items-center text-xs font-medium text-red-700 underline-offset-4 hover:underline"
                >
                  重新整理列表
                </button>
              </div>
            ) : (
              <CollectionsList
                collections={collections}
                selectedCollectionId={selectedCollection}
                onCollectionSelect={handleCollectionSelect}
                onCollectionUpdate={handleCollectionRefresh}
                onRefresh={loadCollections}
              />
            )}
          </div>
        </section>

        <section className="min-h-[480px] rounded-2xl border border-gray-200 bg-white/95 shadow-sm ring-1 ring-gray-100/60">
          {selectedCollection ? (
            (() => {
              const collection = collections.find((item) => item.id === selectedCollection);
              return collection ? (
                <CollectionPreview
                  collection={collection as any}
                  onUpdate={handleCollectionUpdate}
                  onPublish={handlePublish}
                  onUnpublish={handleUnpublish}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-10 text-sm text-gray-500">
                  找不到所選作品集
                </div>
              );
            })()
          ) : (
            <div className="flex h-full items-center justify-center p-10 text-center">
              <div>
                <svg
                  className="mx-auto h-12 w-12 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  />
                </svg>
                <h3 className="mt-3 text-sm font-medium text-gray-900">尚未選擇作品集</h3>
                <p className="mt-1 text-sm text-gray-500">
                  請先在左側列表選擇作品集，便可查看預覽與發布設定。
                </p>
              </div>
            </div>
          )}
        </section>
      </AdminPageLayout>
    </div>
  );
}