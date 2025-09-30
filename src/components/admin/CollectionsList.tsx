'use client';

import { useState } from 'react';

interface Asset {
  id: string;
  cloudflareId: string;
  alt: string;
  filename: string;
}

interface Collection {
  id: string;
  title: string;
  year: number;
  slug: string;
  status: 'draft' | 'published';
  version: number;
  lastPublishedAt: string | null;
  updatedAt: string;
  draftCount?: number;
  checklistStatus?: 'pass' | 'pending';
  // Legacy compatibility fields (optional)
  description?: string | null;
  publishingStatus?: 'draft' | 'published' | null;
  publishedAt?: Date | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  assets?: Asset[];
}

interface CollectionsListProps {
  collections: Collection[];
  selectedCollectionId: string | null;
  onCollectionSelect: (collectionId: string) => void;
  onCollectionUpdate?: (collectionId: string) => void;
  onRefresh: () => void;
}

// T029: Collections list component with status indicators
export function CollectionsList({ 
  collections, 
  selectedCollectionId, 
  onCollectionSelect,
  onCollectionUpdate: _onCollectionUpdate,
  onRefresh 
}: CollectionsListProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = (collection: Collection) => {
    const status = collection.publishingStatus ?? collection.status;
    if (status === 'published') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          已發布
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        草稿
      </span>
    );
  };

  const getChecklistStatus = (collection: Collection) => {
  const hasTitle = typeof collection.title === 'string' && collection.title.trim().length > 0;
  const hasDescription = typeof collection.description === 'string' && collection.description.trim().length > 0;
  const hasSeoTitle = typeof collection.seoTitle === 'string' && collection.seoTitle.trim().length > 0;
  const hasSeoDescription = typeof collection.seoDescription === 'string' && collection.seoDescription.trim().length > 0;
  const hasAssets = Array.isArray(collection.assets) && collection.assets.length > 0;
    
    const checks = [hasTitle, hasDescription, hasSeoTitle, hasSeoDescription, hasAssets];
    const passedChecks = checks.filter(Boolean).length;
    const totalChecks = checks.length;
    
    if (passedChecks === totalChecks) {
      return {
        status: 'pass' as const,
        badge: (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✓ {passedChecks}/{totalChecks}
          </span>
        )
      };
    }
    
    return {
      status: 'pending' as const,
      badge: (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          ⚠ {passedChecks}/{totalChecks}
        </span>
      )
    };
  };

  if (collections.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">沒有找到符合條件的作品集</p>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          {isRefreshing ? '重新整理中...' : '重新整理'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header with refresh */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">作品集列表</h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
          title="重新整理列表"
        >
          {isRefreshing ? '整理中...' : '重新整理'}
        </button>
      </div>

      {/* Collections list */}
      <div className="space-y-2">
        {collections.map((collection) => {
          const isSelected = collection.id === selectedCollectionId;
          const checklistStatus = getChecklistStatus(collection);
          
          return (
            <div
              key={collection.id}
              onClick={() => onCollectionSelect(collection.id)}
              className={`
                p-3 rounded-lg border cursor-pointer transition-colors
                ${isSelected 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              {/* Collection header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {collection.title || '無標題'}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {collection.year} • {collection.slug}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {getStatusBadge(collection)}
                </div>
              </div>

              {/* Description preview */}
              {collection.description && (
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {collection.description}
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {collection.assets?.length ?? 0} 張照片
                  </span>
                  {collection.version > 1 && (
                    <span className="text-xs text-gray-500">
                      v{collection.version}
                    </span>
                  )}
                </div>
                {checklistStatus.badge}
              </div>

              {/* Published date */}
              {collection.publishedAt && (
                <p className="text-xs text-gray-500 mt-1">
                  發布於 {new Date(collection.publishedAt).toLocaleDateString('zh-TW')}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          點選作品集以查看詳情和編輯
        </p>
      </div>
    </div>
  );
}