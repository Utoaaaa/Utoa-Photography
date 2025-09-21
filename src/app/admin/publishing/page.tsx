'use client';

import { useState, useEffect, useCallback } from 'react';
import { CollectionsList } from '@/components/admin/CollectionsList';
import { CollectionPreview } from '@/components/admin/CollectionPreview';
import { PublishingFilters } from '@/components/admin/PublishingFilters';

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

  // Load collections with filters
  const loadCollections = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.year) params.append('year', filters.year);
      if (filters.status) params.append('status', filters.status);
      
      // Always include limit and offset for API compatibility
      params.append('limit', '50');
      params.append('offset', '0');
      
      const response = await fetch(`/api/publishing/collections?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to load collections');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load collections');
      }
      
      let filteredCollections = result.data;
      
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
      setError(err instanceof Error ? err.message : 'Unknown error');
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
    // Placeholder for publish functionality
    console.log('Publishing collection:', collectionId);
    await loadCollections();
  };

  const handleUnpublish = async (collectionId: string) => {
    // Placeholder for unpublish functionality
    console.log('Unpublishing collection:', collectionId);
    await loadCollections();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Left sidebar - Collections list */}
        <div className="w-1/3 border-r border-gray-200 bg-white overflow-hidden flex flex-col">
          <div className="border-b border-gray-200 p-6">
            <h1 className="text-2xl font-bold text-gray-900">Publishing</h1>
            <p className="mt-1 text-sm text-gray-600">
              管理作品集的發布狀態、SEO 設定與版本控制
            </p>
          </div>
          
          <div className="p-4 border-b border-gray-200">
            <PublishingFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              totalCollections={collections.length}
            />
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : error ? (
              <div className="p-4">
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-600">{error}</p>
                  <button
                    onClick={loadCollections}
                    className="mt-2 text-sm text-red-800 hover:text-red-900 underline"
                  >
                    重試
                  </button>
                </div>
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
        </div>

        {/* Right main area - Collection preview */}
        <div className="flex-1 bg-gray-50">
          {selectedCollection ? (
            (() => {
              const collection = collections.find(c => c.id === selectedCollection);
              return collection ? (
                <CollectionPreview
                  collection={collection as any}
                  onUpdate={handleCollectionUpdate}
                  onPublish={handlePublish}
                  onUnpublish={handleUnpublish}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">找不到所選集合</p>
                </div>
              );
            })()
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
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
                <h3 className="mt-2 text-sm font-medium text-gray-900">選擇作品集</h3>
                <p className="mt-1 text-sm text-gray-500">
                  請從左側列表選擇一個作品集來查看詳細資訊和編輯設定
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}