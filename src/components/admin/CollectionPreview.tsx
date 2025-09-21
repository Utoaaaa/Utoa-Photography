'use client';

import { useState, useEffect } from 'react';
import { PhotoViewer } from '@/components/ui/PhotoViewer';

interface Asset {
  id: string;
  cloudflareId: string;
  alt: string;
  filename: string;
}

interface Collection {
  id: string;
  title: string;
  description: string | null;
  year: number;
  slug: string;
  publishingStatus: 'draft' | 'published' | null;
  publishedAt: Date | null;
  version: number;
  seoTitle: string | null;
  seoDescription: string | null;
  assets?: Asset[];
}

interface CollectionPreviewProps {
  collection: Collection | null;
  onUpdate: (updates: Partial<Collection>) => Promise<void>;
  onPublish: (collectionId: string) => Promise<void>;
  onUnpublish: (collectionId: string) => Promise<void>;
}

// T030: Collection preview with PhotoViewer and SEO form
export function CollectionPreview({ 
  collection, 
  onUpdate, 
  onPublish, 
  onUnpublish 
}: CollectionPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    seoTitle: '',
    seoDescription: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form when collection changes
  useEffect(() => {
    if (collection) {
      setEditForm({
        seoTitle: collection.seoTitle || '',
        seoDescription: collection.seoDescription || ''
      });
      setIsEditing(false);
    }
  }, [collection]);

  if (!collection) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <p className="text-sm">選擇一個作品集以查看預覽</p>
          <p className="text-xs mt-1">從左側列表中點選作品集</p>
        </div>
      </div>
    );
  }

  const rawAssets = collection.assets;
  const assets = Array.isArray(rawAssets) ? rawAssets : [];
  const assetCount = assets.length;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onUpdate({
        seoTitle: editForm.seoTitle.trim() || null,
        seoDescription: editForm.seoDescription.trim() || null
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update collection:', error);
      alert('更新失敗，請重試');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      seoTitle: collection.seoTitle || '',
      seoDescription: collection.seoDescription || ''
    });
    setIsEditing(false);
  };

  const handlePublishToggle = async () => {
    setIsLoading(true);
    try {
      if (collection.publishingStatus === 'published') {
        await onUnpublish(collection.id);
      } else {
        await onPublish(collection.id);
      }
    } catch (error) {
      console.error('Failed to toggle publish status:', error);
      alert('發布狀態更新失敗，請重試');
    } finally {
      setIsLoading(false);
    }
  };

  const getChecklistItems = () => {
    return [
      { 
        label: '作品集標題', 
        passed: !!collection.title?.trim(),
        value: collection.title 
      },
      { 
        label: '作品集描述', 
        passed: !!collection.description?.trim(),
        value: collection.description 
      },
      { 
        label: 'SEO 標題', 
        passed: !!collection.seoTitle?.trim(),
        value: collection.seoTitle 
      },
      { 
        label: 'SEO 描述', 
        passed: !!collection.seoDescription?.trim(),
        value: collection.seoDescription 
      },
      { 
        label: '至少一張照片', 
        passed: assetCount > 0,
        value: `${assetCount} 張照片` 
      }
    ];
  };

  const checklist = getChecklistItems();
  const allChecksPassed = checklist.every(item => item.passed);

  // Prepare photos for PhotoViewer - convert to full Asset format
  const photos = assets.map(asset => ({
    id: asset.cloudflareId,
    alt: asset.alt,
    caption: null, // Admin preview doesn't need captions
    width: 1920, // Default dimensions for preview
    height: 1080,
    metadata_json: null,
    created_at: new Date()
  }));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {collection.title || '無標題'}
            </h2>
            <p className="text-sm text-gray-500">
              {collection.year} • {collection.slug}
              {collection.version > 1 && ` • v${collection.version}`}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              collection.publishingStatus === 'published'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {collection.publishingStatus === 'published' ? '已發布' : '草稿'}
            </span>
            <button
              onClick={handlePublishToggle}
              disabled={isLoading || (!allChecksPassed && collection.publishingStatus !== 'published')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                collection.publishingStatus === 'published'
                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {isLoading ? '處理中...' : (
                collection.publishingStatus === 'published' ? '取消發布' : '發布'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content area with scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          
          {/* Photo viewer */}
          {photos.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">照片預覽</h3>
              <div className="bg-gray-100 rounded-lg overflow-hidden" style={{ height: '300px' }}>
                <PhotoViewer 
                  photos={photos} 
                  collectionTitle={collection.title || '無標題'}
                  singleScreen={true}
                />
              </div>
            </div>
          )}

          {/* Checklist */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">發布檢查清單</h3>
            <div className="space-y-2">
              {checklist.map((item, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                    item.passed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.passed ? '✓' : '×'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{item.label}</p>
                    {item.value && (
                      <p className="text-xs text-gray-500 truncate">{item.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {!allChecksPassed && (
              <p className="text-xs text-orange-600 mt-2">
                請完成所有檢查項目後才能發布
              </p>
            )}
          </div>

          {/* SEO form */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">SEO 設定</h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  編輯
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="seo-title" className="block text-xs font-medium text-gray-700 mb-1">
                    SEO 標題
                  </label>
                  <input
                    id="seo-title"
                    type="text"
                    value={editForm.seoTitle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, seoTitle: e.target.value }))}
                    placeholder="輸入 SEO 標題"
                    className="block w-full text-sm border-gray-300 rounded-md focus:ring-gray-500 focus:border-gray-500"
                    maxLength={60}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editForm.seoTitle.length}/60 字元
                  </p>
                </div>

                <div>
                  <label htmlFor="seo-description" className="block text-xs font-medium text-gray-700 mb-1">
                    SEO 描述
                  </label>
                  <textarea
                    id="seo-description"
                    value={editForm.seoDescription}
                    onChange={(e) => setEditForm(prev => ({ ...prev, seoDescription: e.target.value }))}
                    placeholder="輸入 SEO 描述"
                    rows={3}
                    className="block w-full text-sm border-gray-300 rounded-md focus:ring-gray-500 focus:border-gray-500"
                    maxLength={160}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editForm.seoDescription.length}/160 字元
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? '儲存中...' : '儲存'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-gray-700">SEO 標題</p>
                  <p className="text-sm text-gray-900">
                    {collection.seoTitle || <span className="text-gray-500">未設定</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700">SEO 描述</p>
                  <p className="text-sm text-gray-900">
                    {collection.seoDescription || <span className="text-gray-500">未設定</span>}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Published info */}
          {collection.publishedAt && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">發布資訊</h3>
              <p className="text-sm text-gray-600">
                發布於 {new Date(collection.publishedAt).toLocaleString('zh-TW')}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
