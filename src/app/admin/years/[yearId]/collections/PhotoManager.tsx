"use client";

import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';

import { getR2VariantDirectUrl } from '@/lib/images';

interface Asset {
  id: string;
  alt?: string | null;
  caption?: string | null;
  used?: boolean;
  location_folder_id?: string | null;
  location_folder_name?: string | null;
  location_folder_year_label?: string | null;
}

type CollectionAsset = {
  id: string;
  alt?: string | null;
  caption?: string | null;
  order_index: string;
};

type CollectionWithAssets = {
  id: string;
  assets: CollectionAsset[];
};

type ApiError = { message?: string; error?: string };

const isAssetArray = (value: unknown): value is Asset[] =>
  Array.isArray(value) &&
  value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const { id, alt, caption, used } = item as Asset;
    const locationFolderId = (item as Asset).location_folder_id;
    const locationFolderName = (item as Asset).location_folder_name;
    const locationFolderYearLabel = (item as Asset).location_folder_year_label;
    return (
      typeof id === 'string' &&
      (typeof alt === 'string' || alt === null || typeof alt === 'undefined') &&
      (typeof caption === 'string' || caption === null || typeof caption === 'undefined') &&
      (typeof used === 'boolean' || typeof used === 'undefined') &&
      (locationFolderId === undefined || locationFolderId === null || typeof locationFolderId === 'string') &&
      (locationFolderName === undefined || locationFolderName === null || typeof locationFolderName === 'string') &&
      (locationFolderYearLabel === undefined || locationFolderYearLabel === null || typeof locationFolderYearLabel === 'string')
    );
  });

const isCollectionWithAssets = (value: unknown): value is CollectionWithAssets => {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Partial<CollectionWithAssets>;
  return (
    typeof obj?.id === 'string' &&
    Array.isArray(obj.assets) &&
    obj.assets.every((asset) =>
      asset &&
      typeof asset === 'object' &&
      typeof asset.id === 'string' &&
      typeof asset.order_index === 'string' &&
      (typeof asset.alt === 'string' || asset.alt === null || typeof asset.alt === 'undefined') &&
      (typeof asset.caption === 'string' || asset.caption === null || typeof asset.caption === 'undefined'),
    )
  );
};

const isApiError = (value: unknown): value is ApiError => {
  if (!value || typeof value !== 'object') return false;
  const { message, error } = value as ApiError;
  return (typeof message === 'string' || typeof message === 'undefined') && (typeof error === 'string' || typeof error === 'undefined');
};

async function safeJson<T>(res: Response, fallback: T, validate?: (value: unknown) => value is T): Promise<T> {
  try {
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return fallback;
    const text = await res.text();
    if (!text) return fallback;
    const parsed: unknown = JSON.parse(text);
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

async function delay(ms: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchJsonWithRetry<T>(
  url: string,
  init: RequestInit | undefined,
  fallback: T,
  validate?: (value: unknown) => value is T,
  retries = 2,
  delayMs = 150,
): Promise<{ ok: boolean; data: T; status: number }> {
  let lastStatus = 0;
  let lastData = fallback;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, init);
      lastStatus = res.status;
      const data = await safeJson<T>(res, fallback, validate);
      lastData = data;
      if (res.ok) return { ok: true, data, status: res.status };
    } catch {
      lastData = fallback;
    }
    if (attempt < retries) await delay(delayMs);
  }
  return { ok: false, data: lastData, status: lastStatus };
}

interface PhotoManagerProps {
  collectionId: string;
  collectionTitle?: string;
  onClose: () => void;
  onUpdated?: () => void;
  collectionLocationId?: string | null;
}

export default function PhotoManager({ collectionId, collectionTitle, onClose, onUpdated, collectionLocationId }: PhotoManagerProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [collectionAssets, setCollectionAssets] = useState<CollectionAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const locationFilterActive = Boolean(collectionLocationId);
  // Tabs: default show unused photos; only render used list after click
  const [activeTab, setActiveTab] = useState<'unused' | 'used'>('unused');
  const [usedTabInitialized, setUsedTabInitialized] = useState(false);
  const { unusedAssets, usedAssets } = useMemo(() => {
    const collectionAssetIds = new Set(collectionAssets.map((asset) => asset.id));
    const unused: Asset[] = [];
    const used: Asset[] = [];
    for (const asset of assets) {
      if (collectionAssetIds.has(asset.id)) continue;
      if (asset.used) {
        used.push(asset);
      } else {
        unused.push(asset);
      }
    }
    return { unusedAssets: unused, usedAssets: used };
  }, [assets, collectionAssets]);

  useEffect(() => {
    (async () => {
      if (!collectionId) {
        setLoading(false);
        setAssets([]);
        setCollectionAssets([]);
        return;
      }
      try {
        const assetParams = new URLSearchParams({ limit: '200', offset: '0' });
        if (collectionLocationId) {
          assetParams.set('location_folder_id', collectionLocationId);
        }
        const assetUrl = assetParams.toString() ? `/api/admin/assets?${assetParams.toString()}` : '/api/admin/assets';
        const { ok: assetsOk, data: assetsData } = await fetchJsonWithRetry<Asset[]>(
          assetUrl,
          { cache: 'no-store' },
          [],
          isAssetArray,
        );
        if (!assetsOk) throw new Error('Failed to load assets');
        setAssets(Array.isArray(assetsData) ? assetsData : []);

        const { ok: collectionOk, data: colData } = await fetchJsonWithRetry<CollectionWithAssets>(
          `/api/admin/collections/${collectionId}?include_assets=true`,
          { cache: 'no-store' },
          { id: collectionId, assets: [] },
          isCollectionWithAssets,
        );
        if (!collectionOk) throw new Error('Failed to load collection');
        const list = Array.isArray(colData?.assets) ? colData.assets : [];
        setCollectionAssets(list.map((asset) => ({
          id: asset.id,
          alt: asset.alt,
          caption: asset.caption,
          order_index: asset.order_index,
        })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assets');
      } finally {
        setLoading(false);
      }
    })();
  }, [collectionId, collectionLocationId]);

  const refreshCollectionAssets = async () => {
    if (!collectionId) return;
    try {
      const { ok, data: col } = await fetchJsonWithRetry<CollectionWithAssets>(
        `/api/admin/collections/${collectionId}?include_assets=true`,
        { cache: 'no-store' },
        { id: collectionId, assets: [] },
        isCollectionWithAssets,
      );
      if (!ok) return;
      const list = Array.isArray(col?.assets) ? col.assets : [];
      setCollectionAssets(list.map((asset) => ({
        id: asset.id,
        alt: asset.alt,
        caption: asset.caption,
        order_index: asset.order_index,
      })));
    } catch {
      // ignore refresh errors
    }
  };

  const toggleSelect = (assetId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  const addToCollection = async () => {
    setMessage(null);
    const asset_ids = Array.from(selected);
    if (asset_ids.length === 0) return;
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}/assets`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ asset_ids }),
      });
      if (!res.ok) {
        const body = await safeJson<ApiError>(res, {}, isApiError);
        throw new Error(body.message || body.error || 'Failed to add assets');
      }
      setMessage({ type: 'success', text: 'Added to collection' });
      setSelected(new Set());
      await refreshCollectionAssets();
      await onUpdated?.();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to add assets' });
    }
  };

  const removeFromCollection = async (assetId: string) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}/assets/${assetId}`, { method: 'DELETE' });
      if (res.status !== 204) {
        const body = await safeJson<ApiError>(res, {}, isApiError);
        throw new Error(body.message || body.error || 'Failed to remove asset');
      }
      setMessage({ type: 'success', text: 'Removed from collection' });
      await refreshCollectionAssets();
      await onUpdated?.();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to remove asset' });
    }
  };

  const persistReorder = async (list: Array<{ id: string }>) => {
    const reorder = list.map((asset, index) => ({ asset_id: asset.id, order_index: (index + 1).toString() }));
    const res = await fetch(`/api/admin/collections/${collectionId}/assets`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reorder }),
    });
    if (!res.ok) {
      const body = await safeJson<ApiError>(res, {}, isApiError);
      throw new Error(body.message || body.error || 'Failed to reorder');
    }
  };

  const moveAsset = async (assetId: string, delta: -1 | 1) => {
    setMessage(null);
    const currentIndex = collectionAssets.findIndex((item) => item.id === assetId);
    if (currentIndex < 0) return;
    const targetIndex = currentIndex + delta;
    if (targetIndex < 0 || targetIndex >= collectionAssets.length) return;
    const next = [...collectionAssets];
    const [moved] = next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, moved);
    setCollectionAssets(next);
    setDraggingId(null);
    try {
      await persistReorder(next);
      setMessage({ type: 'success', text: 'Photo order updated' });
      await onUpdated?.();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Reorder failed' });
      await refreshCollectionAssets();
    }
  };

  const onDropReorder = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const items = [...collectionAssets];
    const fromIndex = items.findIndex((asset) => asset.id === draggingId);
    const toIndex = items.findIndex((asset) => asset.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    setCollectionAssets(items);
    try {
      await persistReorder(items);
      setMessage({ type: 'success', text: 'Photo order updated' });
      await onUpdated?.();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Reorder failed' });
    } finally {
      setDraggingId(null);
    }
  };

  const onAssetKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>, assetId: string) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      void moveAsset(assetId, -1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      void moveAsset(assetId, 1);
    }
  };

  return (
    <div className="w-[min(90vw,960px)] max-w-5xl" data-testid="photo-manager">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 id="photo-manager-title" className="text-xl font-semibold text-gray-900">Manage Photos</h2>
          <p className="text-sm text-gray-600">Collection：{collectionTitle || collectionId}</p>
        </div>
        <button
          type="button"
          className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          onClick={onClose}
          data-testid="close-photo-manager-btn"
        >
          Close
        </button>
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-600" data-testid="error-message">
          {error}
        </div>
      )}
      {message && (
        <div
          className={`mb-3 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
          data-testid={message.type === 'success' ? 'success-message' : 'error-message'}
        >
          {message.text}
        </div>
      )}

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <h3 className="text-base font-medium text-gray-900">Available assets</h3>
            <div className="mt-2 inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5" role="tablist" aria-label="asset usage tabs">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'unused'}
                data-testid="tab-unused"
                className={`px-3 py-1 text-sm rounded ${activeTab === 'unused' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'}`}
                onClick={() => setActiveTab('unused')}
              >
                未使用
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'used'}
                data-testid="tab-used"
                className={`px-3 py-1 text-sm rounded ${activeTab === 'used' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'}`}
                onClick={() => {
                  setActiveTab('used');
                  if (!usedTabInitialized) setUsedTabInitialized(true);
                }}
              >
                已使用於其他作品集
              </button>
            </div>
          </div>
          <button
            type="button"
            data-testid="add-to-collection-btn"
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={addToCollection}
            disabled={selected.size === 0}
          >
            Add to Collection
          </button>
        </div>
        {locationFilterActive && (
          <p className="mb-3 text-xs text-gray-500">
            僅顯示指派至此地點資料夾的照片。若缺少照片，請到「Uploads」頁面上傳或指派地點。
          </p>
        )}
        {/* Enable vertical scroll for photo previews */}
        <div className="max-h-[65vh] overflow-y-auto pr-1" data-testid="available-assets-scroll">
          {activeTab === 'unused' && (
            <div data-testid="available-assets-unused" className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {loading && <div className="col-span-full text-sm text-gray-500">Loading assets…</div>}
              {!loading && unusedAssets.length === 0 && (
                <div className="col-span-full text-sm text-gray-500">
                  {locationFilterActive ? '此地點尚未有照片，請於上傳頁面建立後再試。' : '沒有可用的未使用照片'}
                </div>
              )}
              {!loading && unusedAssets.map((asset) => {
                const isSelected = selected.has(asset.id);
                const locationLabel = asset.location_folder_name
                  ? `${asset.location_folder_year_label ? `${asset.location_folder_year_label} · ` : ''}${asset.location_folder_name}`
                  : '未指派地點';
                const previewSrc = getR2VariantDirectUrl(asset.id, 'thumb');
                const previewAlt = asset.alt || 'Asset preview';
                return (
                  <button
                    type="button"
                    key={asset.id}
                    data-testid="asset-card"
                    className={`flex flex-col rounded border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring ${
                      isSelected ? 'ring-2 ring-blue-500' : ''
                    }`}
                    aria-pressed={isSelected}
                    onClick={() => toggleSelect(asset.id)}
                  >
                    <div
                      className="mb-2 overflow-hidden rounded border bg-gray-50"
                      style={{ aspectRatio: '4 / 3' }}
                    >
                      <img src={previewSrc} alt={previewAlt} loading="lazy" className="h-full w-full object-cover" />
                    </div>
                    <div className="font-mono text-xs text-gray-700">{asset.id}</div>
                    {asset.alt && <div className="mt-1 text-sm text-gray-900">{asset.alt}</div>}
                    <div className={`mt-1 text-[11px] ${asset.location_folder_id ? 'text-gray-600' : 'text-gray-400'}`}>{locationLabel}</div>
                  </button>
                );
              })}
            </div>
          )}
          {activeTab === 'used' && usedTabInitialized && (
            <div data-testid="available-assets-used" className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {loading && <div className="col-span-full text-sm text-gray-500">Loading assets…</div>}
              {!loading && usedAssets.length === 0 && (
                <div className="col-span-full text-sm text-gray-500">目前沒有「已使用」的照片</div>
              )}
              {!loading && usedAssets.map((asset) => {
                const isSelected = selected.has(asset.id);
                const locationLabel = asset.location_folder_name
                  ? `${asset.location_folder_year_label ? `${asset.location_folder_year_label} · ` : ''}${asset.location_folder_name}`
                  : '未指派地點';
                const previewSrc = getR2VariantDirectUrl(asset.id, 'thumb');
                const previewAlt = asset.alt || 'Asset preview';
                return (
                  <button
                    type="button"
                    key={asset.id}
                    data-testid="asset-card"
                    className={`flex flex-col rounded border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring ${
                      isSelected ? 'ring-2 ring-blue-500' : ''
                    }`}
                    aria-pressed={isSelected}
                    onClick={() => toggleSelect(asset.id)}
                  >
                    <div
                      className="mb-2 overflow-hidden rounded border bg-gray-50 relative"
                      style={{ aspectRatio: '4 / 3' }}
                    >
                      <img src={previewSrc} alt={previewAlt} loading="lazy" className="h-full w-full object-cover" />
                      <span
                        className="absolute left-2 top-2 inline-block rounded bg-gray-900/70 px-2 py-0.5 text-[10px] font-medium text-white"
                        title="This photo is already used in a collection"
                        data-testid="asset-used-badge"
                      >
                        USED
                      </span>
                    </div>
                    <div className="font-mono text-xs text-gray-700">{asset.id}</div>
                    {asset.alt && <div className="mt-1 text-sm text-gray-900">{asset.alt}</div>}
                    <div className={`mt-1 text-[11px] ${asset.location_folder_id ? 'text-gray-600' : 'text-gray-400'}`}>{locationLabel}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-base font-medium text-gray-900">Assets in collection</h3>
        <div className="max-h-[40vh] overflow-y-auto pr-1" data-testid="collection-assets-scroll">
          <div data-testid="collection-assets" className="grid grid-cols-1 gap-2">
          {collectionAssets.map((asset, index) => {
            const isFirst = index === 0;
            const isLast = index === collectionAssets.length - 1;
            const previewSrc = getR2VariantDirectUrl(asset.id, 'thumb');
            const previewAlt = asset.alt || 'Collection asset preview';
            const orderNumber = index + 1;
            return (
              <div
                key={asset.id}
                data-testid="collection-asset"
                className="flex flex-col gap-3 rounded border border-gray-200 bg-gray-50 p-3 text-sm shadow-sm transition focus:outline-none focus:ring focus:ring-blue-200 focus:ring-offset-2 md:flex-row md:items-center md:justify-between"
                draggable
                tabIndex={0}
                onKeyDown={(event) => onAssetKeyDown(event, asset.id)}
                onFocus={() => setDraggingId(null)}
                onDragStart={() => setDraggingId(asset.id)}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={() => void onDropReorder(asset.id)}
              >
                <div className="flex w-full items-start gap-3 md:w-auto">
                  <div
                    className="relative overflow-hidden rounded border bg-white"
                    style={{ aspectRatio: '4 / 3', width: '120px' }}
                  >
                    <img src={previewSrc} alt={previewAlt} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">順序：{orderNumber}</div>
                    <div className="font-mono text-xs text-gray-700">ID：{asset.id}</div>
                    <div className="text-sm font-medium text-gray-900">{asset.alt || '（未提供 Alt）'}</div>
                    {asset.caption && <div className="text-xs text-gray-500">{asset.caption}</div>}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 md:flex-col md:items-end">
                  <div className="flex gap-1" aria-label="reorder photo controls">
                    <button
                      type="button"
                      className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => void moveAsset(asset.id, -1)}
                      disabled={isFirst}
                      aria-disabled={isFirst}
                      title="Move photo up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => void moveAsset(asset.id, 1)}
                      disabled={isLast}
                      aria-disabled={isLast}
                      title="Move photo down"
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                    data-testid="remove-collection-asset-btn"
                    onClick={() => void removeFromCollection(asset.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
          {!loading && collectionAssets.length === 0 && (
            <div className="text-sm text-gray-500">No assets in this collection yet</div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
