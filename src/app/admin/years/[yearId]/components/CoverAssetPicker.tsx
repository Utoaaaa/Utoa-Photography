'use client';

import { useEffect, useMemo, useState } from 'react';

import { getImageUrl } from '@/lib/images';

interface BaseAsset {
  id: string;
  alt?: string | null;
  caption?: string | null;
  metadata_json?: unknown;
}

interface LocationAsset extends BaseAsset {
  location_folder_name?: string | null;
  location_folder_year_label?: string | null;
}

interface CollectionAsset extends BaseAsset {
  order_index: string;
}

type CoverAssetPickerSource =
  | { type: 'location'; locationId: string }
  | { type: 'collection'; collectionId: string };

export interface CoverAssetPickerProps {
  label?: string;
  description?: string;
  emptyHint?: string;
  source?: CoverAssetPickerSource | null;
  selectedAssetId: string | null;
  onSelect: (assetId: string | null) => void;
  allowClear?: boolean;
  className?: string;
}

const gridBaseClasses =
  'mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

export default function CoverAssetPicker({
  label = '封面圖片',
  description = '點擊圖片即可指定封面，未選擇則為預設顯示。',
  emptyHint = '尚未找到可用的照片。',
  source = null,
  selectedAssetId,
  onSelect,
  allowClear = true,
  className = '',
}: CoverAssetPickerProps) {
  const [assets, setAssets] = useState<Array<BaseAsset & Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKey = useMemo(() => {
    if (!source) return 'none';
    if (source.type === 'location') return `location:${source.locationId}`;
    return `collection:${source.collectionId}`;
  }, [source]);

  useEffect(() => {
    let didCancel = false;
    const controller = new AbortController();

    async function loadAssets() {
      if (!source) {
        setAssets([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(buildUrl(source), {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('無法載入封面圖片。');
        }

        const data = await parseResponse(response, source.type);
        if (!didCancel) {
          setAssets(data);
        }
      } catch (error) {
        if (didCancel || controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : '載入封面圖片時發生錯誤。';
        setError(message);
        setAssets([]);
      } finally {
        if (!didCancel) setLoading(false);
      }
    }

    void loadAssets();

    return () => {
      didCancel = true;
      controller.abort();
    };
  }, [fetchKey, source]);

  const selectedMissing =
    selectedAssetId && !assets.some((asset) => asset.id === selectedAssetId);

  return (
    <div className={className} data-testid="cover-asset-picker">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        {allowClear && selectedAssetId && (
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50"
            onClick={() => onSelect(null)}
          >
            清除選擇
          </button>
        )}
      </div>

      {selectedMissing && (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          目前選擇的封面照片不在清單中，可能已被移除或未屬於此範圍。
        </div>
      )}

      <div className={gridBaseClasses}>
        {renderContent({ loading, error, assets, emptyHint, selectedAssetId, onSelect })}
      </div>
    </div>
  );
}

function buildUrl(source: CoverAssetPickerSource): string {
  if (source.type === 'location') {
    const params = new URLSearchParams({ limit: '200', offset: '0', location_folder_id: source.locationId });
    return `/api/admin/assets?${params.toString()}`;
  }
  return `/api/admin/collections/${encodeURIComponent(source.collectionId)}?include_assets=true`;
}

async function parseResponse(
  response: Response,
  type: CoverAssetPickerSource['type'],
): Promise<Array<BaseAsset & Record<string, unknown>>> {
  const text = await response.text();
  if (!text) return [];
  try {
    const payload = JSON.parse(text) as unknown;
    if (type === 'location') {
      if (!Array.isArray(payload)) return [];
      return payload.filter(isLocationAsset).map((asset) => ({ ...asset }));
    }
    if (!payload || typeof payload !== 'object') return [];
    const assets = (payload as { assets?: unknown }).assets;
    if (!Array.isArray(assets)) return [];
    return assets.filter(isCollectionAsset).map((asset) => ({ ...asset }));
  } catch {
    return [];
  }
}

function isLocationAsset(value: unknown): value is LocationAsset {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LocationAsset> & Record<string, unknown>;
  return typeof candidate.id === 'string';
}

function isCollectionAsset(value: unknown): value is CollectionAsset {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CollectionAsset> & Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.order_index === 'string';
}

function renderContent({
  loading,
  error,
  assets,
  emptyHint,
  selectedAssetId,
  onSelect,
}: {
  loading: boolean;
  error: string | null;
  assets: Array<BaseAsset & Record<string, unknown>>;
  emptyHint: string;
  selectedAssetId: string | null;
  onSelect: (assetId: string | null) => void;
}) {
  if (!loading && !error && assets.length === 0) {
    return (
      <div className="col-span-full rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-xs text-gray-500">
        {emptyHint}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="col-span-full rounded-md border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-600">
        載入封面圖片中…
      </div>
    );
  }

  if (error) {
    return (
      <div className="col-span-full rounded-md border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-600">
        {error}
      </div>
    );
  }

  return assets.map((asset) => {
    const isSelected = asset.id === selectedAssetId;
    const previewUrl = getImageUrl(asset.id, 'thumb', { metadata: asset.metadata_json });
    const alt = typeof asset.alt === 'string' && asset.alt.trim().length > 0 ? asset.alt : '封面圖片預覽';
    const caption = typeof asset.caption === 'string' && asset.caption.trim().length > 0 ? asset.caption : null;
    return (
      <button
        type="button"
        key={asset.id}
        data-testid="cover-asset-option"
        data-asset-id={asset.id}
        onClick={() => onSelect(asset.id)}
        aria-pressed={isSelected}
        className={`group flex flex-col overflow-hidden rounded-lg border text-left shadow-sm transition focus:outline-none focus:ring focus:ring-blue-200 focus:ring-offset-2 ${
          isSelected ? 'border-blue-500 ring-1 ring-blue-400' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="relative bg-gray-100">
          <div className="aspect-[4/3] overflow-hidden">
            <img src={previewUrl} alt={alt} className="h-full w-full object-cover transition group-hover:scale-[1.02]" loading="lazy" />
          </div>
        </div>
        <div className="space-y-1 px-3 py-2">
          <p className="font-mono text-xs text-gray-600">{asset.id}</p>
          {caption && <p className="text-xs text-gray-700">{caption}</p>}
        </div>
      </button>
    );
  });
}
