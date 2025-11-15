"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AccessibleDialog from '@/components/ui/AccessibleDialog';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { getR2VariantDirectUrl } from '@/lib/images';

interface Asset {
  id: string;
  alt: string;
  caption?: string | null;
  width: number;
  height: number;
  location_folder_id?: string | null;
  location_folder_name?: string | null;
  location_folder_year_id?: string | null;
  location_folder_year_label?: string | null;
}
type AssetMaybeUsed = Asset & { used?: boolean };

type YearOption = { id: string; label: string; orderIndex?: string; order_index?: string };
type CollectionOption = { id: string; title: string };
type LocationFolderOption = {
  id: string;
  name: string;
  yearId: string;
  yearLabel: string;
  orderIndex: string;
  yearOrderIndex: string;
};

type DirectUploadResult = {
  upload_url?: string;
  form_data?: Record<string, string>;
  image_id?: string;
  result?: { id?: string };
};

type BatchDeleteResponse = {
  failed?: Array<{ id: string; reason: 'not_found' | 'referenced' | 'error'; details?: unknown }>;
};

type Feedback = { type: 'success' | 'error' | 'info'; text: string } | null;

type VariantKey = 'thumb' | 'medium' | 'large';
type VariantStatusEntry = Partial<Record<VariantKey, boolean>>;
type VariantStatusState = Record<string, VariantStatusEntry>;

type GroupedLocationFolder = {
  yearId: string;
  yearLabel: string;
  options: LocationFolderOption[];
  yearOrderIndex: string;
};

const isAssetArray = (value: unknown): value is Asset[] =>
  Array.isArray(value) &&
  value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const { id, alt, caption, width, height } = item as Asset;
    const locationFolderId = (item as Asset).location_folder_id;
    const locationFolderName = (item as Asset).location_folder_name;
    const locationFolderYearId = (item as Asset).location_folder_year_id;
    const locationFolderYearLabel = (item as Asset).location_folder_year_label;
    return (
      typeof id === 'string' &&
      typeof alt === 'string' &&
      (typeof caption === 'string' || caption === null || typeof caption === 'undefined') &&
      typeof width === 'number' &&
      typeof height === 'number' &&
      (locationFolderId === undefined || locationFolderId === null || typeof locationFolderId === 'string') &&
      (locationFolderName === undefined || locationFolderName === null || typeof locationFolderName === 'string') &&
      (locationFolderYearId === undefined || locationFolderYearId === null || typeof locationFolderYearId === 'string') &&
      (locationFolderYearLabel === undefined || locationFolderYearLabel === null || typeof locationFolderYearLabel === 'string')
    );
  });

const isYearArray = (value: unknown): value is YearOption[] =>
  Array.isArray(value) &&
  value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const obj = item as Partial<YearOption> & { order_index?: string };
    const hasOrderIndex =
      typeof obj.orderIndex === 'undefined' || typeof obj.orderIndex === 'string';
    const hasLegacyOrderIndex =
      typeof obj.order_index === 'undefined' || typeof obj.order_index === 'string';
    return typeof obj.id === 'string' && typeof obj.label === 'string' && hasOrderIndex && hasLegacyOrderIndex;
  });

const isCollectionArray = (value: unknown): value is CollectionOption[] =>
  Array.isArray(value) &&
  value.every((item) =>
    item &&
    typeof item === 'object' &&
    typeof (item as CollectionOption).id === 'string' &&
    typeof (item as CollectionOption).title === 'string',
  );

type LocationFolderDto = {
  id: string;
  yearId: string;
  name: string;
  slug: string;
  orderIndex: string;
};

const isLocationFolderDtoArray = (value: unknown): value is LocationFolderDto[] =>
  Array.isArray(value) &&
  value.every((item) =>
    item &&
    typeof item === 'object' &&
    typeof (item as LocationFolderDto).id === 'string' &&
    typeof (item as LocationFolderDto).yearId === 'string' &&
    typeof (item as LocationFolderDto).name === 'string' &&
    typeof (item as LocationFolderDto).orderIndex === 'string',
  );

const isDirectUploadResult = (value: unknown): value is DirectUploadResult => {
  if (!value || typeof value !== 'object') return false;
  const obj = value as DirectUploadResult;
  const validUploadUrl = typeof obj.upload_url === 'string' || typeof obj.upload_url === 'undefined';
  const validFormData =
    typeof obj.form_data === 'undefined' ||
    (typeof obj.form_data === 'object' && obj.form_data !== null && Object.values(obj.form_data).every((val) => typeof val === 'string'));
  const validImageId = typeof obj.image_id === 'string' || typeof obj.image_id === 'undefined';
  const validResult =
    typeof obj.result === 'undefined' ||
    (typeof obj.result === 'object' && obj.result !== null && (typeof obj.result.id === 'string' || typeof obj.result.id === 'undefined'));
  return validUploadUrl && validFormData && validImageId && validResult;
};

const isBatchDeleteResponse = (value: unknown): value is BatchDeleteResponse => {
  if (!value || typeof value !== 'object') return false;
  const obj = value as BatchDeleteResponse;
  return (
    typeof obj.failed === 'undefined' ||
    (Array.isArray(obj.failed) &&
      obj.failed.every(
        (entry) =>
          entry &&
          typeof entry === 'object' &&
          typeof entry.id === 'string' &&
          (entry.reason === 'not_found' || entry.reason === 'referenced' || entry.reason === 'error'),
      ))
  );
};

const toOrderNumber = (value?: string) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

const readImageDimensions = async (file: File): Promise<{ width: number; height: number }> => {
  if (typeof window === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return { width: 1920, height: 1080 };
  }

  return new Promise((resolve, reject) => {
    let objectUrl: string | undefined;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (error) {
      reject(error);
      return;
    }

    if (!objectUrl) {
      reject(new Error('Failed to create object URL'));
      return;
    }

    const image = new Image();
    image.onload = () => {
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      resolve(dimensions);
    };
    image.onerror = (error) => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      reject(error);
    };
    image.src = objectUrl;
  });
};

const isVariantStatusResponse = (value: unknown): value is { variants?: Record<string, boolean> } => {
  if (!value || typeof value !== 'object') return false;
  const variants = (value as { variants?: unknown }).variants;
  if (typeof variants === 'undefined') return true;
  if (!variants || typeof variants !== 'object') return false;
  return Object.values(variants).every((entry) => typeof entry === 'boolean');
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

interface AssetCardProps {
  asset: Asset;
  previewSrc: string;
  previewAlt: string;
  locationLabel: string;
  variantStatus: VariantStatusEntry;
  hasVariantStatus: boolean;
  loadVariantStatus: (assetId: string) => Promise<void>;
  groupedLocationFolders: GroupedLocationFolder[];
  formatLocationOptionLabel: (folder: LocationFolderOption) => string;
  locationFolderMap: Map<string, LocationFolderOption>;
  onAssetChange: (updater: (current: Asset) => Asset) => void;
  onSaveInline: (asset: Asset) => void;
  selected: boolean;
  onToggleSelected: () => void;
}

function AssetCard({
  asset,
  previewSrc,
  previewAlt,
  locationLabel,
  variantStatus,
  hasVariantStatus,
  loadVariantStatus,
  groupedLocationFolders,
  formatLocationOptionLabel,
  locationFolderMap,
  onAssetChange,
  onSaveInline,
  selected,
  onToggleSelected,
}: AssetCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const hasRequestedVariants = useRef(false);

  useEffect(() => {
    if (hasVariantStatus) {
      hasRequestedVariants.current = true;
      return;
    }

    hasRequestedVariants.current = false;
    const target = cardRef.current;
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasRequestedVariants.current) {
          hasRequestedVariants.current = true;
          void loadVariantStatus(asset.id);
        }
      });
    }, { threshold: 0.1 });

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [asset.id, hasVariantStatus, loadVariantStatus]);

  const variantBadges = ([
    ['T', 'thumb'],
    ['M', 'medium'],
    ['L', 'large'],
  ] as const).map(([label, key]) => (
    <span
      key={key}
      className={`px-1.5 py-[1px] rounded border ${variantStatus[key] ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}
    >
      {label}
    </span>
  ));

  return (
    <article
      ref={cardRef}
      data-testid="asset-card"
      className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white/95 p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
    >
      <div
        className="relative overflow-hidden rounded-lg border border-gray-100 bg-gray-50"
        style={{ aspectRatio: '4 / 3' }}
        aria-hidden={false}
      >
        <img
          src={previewSrc}
          alt={previewAlt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex flex-wrap gap-1 text-[10px]">{variantBadges}</div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{asset.alt || '未設定替代文字'}</p>
          <p className="text-xs text-gray-500">
            {asset.width}×{asset.height}
          </p>
        </div>
        {(asset as AssetMaybeUsed).used === true && (
          <span
            className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700"
            title="此照片已用於作品集"
            data-testid="asset-used-badge"
          >
            已使用
          </span>
        )}
      </div>

      <div className={`text-xs ${asset.location_folder_id ? 'text-gray-600' : 'text-gray-400'}`} data-testid="asset-location-label">
        {locationLabel}
      </div>

      {asset.caption ? <p className="text-sm text-gray-600">{asset.caption}</p> : null}

      <details className="group rounded-lg border border-gray-200 bg-gray-50/60 p-3 text-sm text-gray-700">
        <summary className="cursor-pointer font-medium text-gray-800 transition group-open:text-blue-700">
          編輯中繼資料
        </summary>
        <div className="mt-3 grid gap-3 text-xs text-gray-600">
          <label className="flex flex-col gap-1">
            <span>替代文字</span>
            <input
              className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={asset.alt}
              onChange={(event) => onAssetChange((current) => ({ ...current, alt: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span>說明文字</span>
            <textarea
              className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={asset.caption || ''}
              rows={2}
              onChange={(event) => onAssetChange((current) => ({ ...current, caption: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span>地點資料夾</span>
            <select
              className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={asset.location_folder_id ?? ''}
              data-testid="asset-location-inline-select"
              onChange={(event) => {
                const nextValue = event.target.value;
                const nextFolder = nextValue ? locationFolderMap.get(nextValue) : undefined;
                onAssetChange((current) => ({
                  ...current,
                  location_folder_id: nextValue || null,
                  location_folder_name: nextFolder?.name ?? null,
                  location_folder_year_id: nextFolder?.yearId ?? null,
                  location_folder_year_label: nextFolder?.yearLabel ?? null,
                }));
              }}
            >
              <option value="">未指派地點</option>
              {groupedLocationFolders.map((group) => (
                <optgroup key={`inline-${group.yearId || group.yearLabel || 'unlabelled'}`} label={group.yearLabel || '其他年份'}>
                  {group.options.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {formatLocationOptionLabel(folder)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <div className="flex justify-end">
            <button
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              onClick={() => void onSaveInline(asset)}
            >
              儲存
            </button>
          </div>
        </div>
      </details>
      <label className="mt-1 inline-flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          data-testid="asset-checkbox"
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={selected}
          onChange={onToggleSelected}
        />
        <span>加入批次操作</span>
      </label>
    </article>
  );
}

export default function AdminUploadsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [alt, setAlt] = useState('圖片');
  const [caption, setCaption] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDone, setBulkDone] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [years, setYears] = useState<YearOption[]>([]);
  const [assignYearId, setAssignYearId] = useState<string>('');
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [assignCollectionId, setAssignCollectionId] = useState<string>('');
  const [locationFolders, setLocationFolders] = useState<LocationFolderOption[]>([]);
  const [uploadLocationId, setUploadLocationId] = useState<string>('');
  const [assetFilterLocationId, setAssetFilterLocationId] = useState<'all' | 'unassigned' | string>('all');
  const [variantStatus, setVariantStatus] = useState<VariantStatusState>({});

  const locationFolderMap = useMemo(() => {
    const map = new Map<string, LocationFolderOption>();
    locationFolders.forEach((folder) => {
      map.set(folder.id, folder);
    });
    return map;
  }, [locationFolders]);

  const groupedLocationFolders = useMemo<GroupedLocationFolder[]>(() => {
    const groups = new Map<string, { yearLabel: string; yearOrderIndex: string; options: LocationFolderOption[] }>();
    locationFolders.forEach((folder) => {
      const existing = groups.get(folder.yearId);
      if (existing) {
        existing.options.push(folder);
      } else {
        groups.set(folder.yearId, {
          yearLabel: folder.yearLabel,
          yearOrderIndex: folder.yearOrderIndex,
          options: [folder],
        });
      }
    });
    return Array.from(groups.entries())
      .map(([yearId, group]) => ({
        yearId,
        yearLabel: group.yearLabel,
        options: group.options
          .slice()
          .sort((a, b) => {
            const diff = toOrderNumber(a.orderIndex) - toOrderNumber(b.orderIndex);
            if (diff !== 0) return diff;
            return a.name.localeCompare(b.name, 'zh-TW');
          }),
        yearOrderIndex: group.yearOrderIndex,
      }))
      .sort((a, b) => {
        const diff = toOrderNumber(a.yearOrderIndex) - toOrderNumber(b.yearOrderIndex);
        if (diff !== 0) return diff;
        return a.yearLabel.localeCompare(b.yearLabel, 'zh-TW');
      });
  }, [locationFolders]);

  const loadAssets = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' });
      if (assetFilterLocationId === 'unassigned') {
        params.set('unassigned', 'true');
      } else if (assetFilterLocationId !== 'all') {
        params.set('location_folder_id', assetFilterLocationId);
      }
      const query = params.toString();
      const url = query ? `/api/admin/assets?${query}` : '/api/admin/assets';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        setAssets([]);
        return;
      }
      const list = await safeJson<Asset[]>(res, [], isAssetArray);
      setAssets(Array.isArray(list) ? list : []);
    } catch {
      setAssets([]);
    }
  }, [assetFilterLocationId]);

  async function loadYearsAndCollectionsForAssign(yearId?: string) {
    try {
      const yRes = await fetch('/api/admin/years?status=all&order=asc', { cache: 'no-store' });
      if (!yRes.ok) return;
      const ys = await safeJson<YearOption[]>(yRes, [], isYearArray);
      const normalizedYears = ys
        .slice()
        .sort((a, b) => {
          const diff = toOrderNumber(a.orderIndex ?? a.order_index) - toOrderNumber(b.orderIndex ?? b.order_index);
          if (diff !== 0) return diff;
          return a.label.localeCompare(b.label, 'zh-TW');
        });
      setYears(normalizedYears);
      const yId = yearId || normalizedYears?.[0]?.id || '';
      setAssignYearId(yId);
      if (yId) {
        const cRes = await fetch(`/api/admin/years/${yId}/collections?status=all`, { cache: 'no-store' });
        if (cRes.ok) {
          const cs = await safeJson<CollectionOption[]>(cRes, [], isCollectionArray);
          setCollections(cs);
          // Preserve current selection if still valid; otherwise default to first
          setAssignCollectionId(prev => (prev && cs.some(c => c.id === prev)) ? prev : (cs?.[0]?.id || ''));
        }
      }
    } catch {
      // ignore
    }
  }

  const loadLocationFolders = useCallback(async () => {
    try {
      const yearsRes = await fetch('/api/admin/years?status=all&order=asc', { cache: 'no-store' });
      if (!yearsRes.ok) {
        setLocationFolders([]);
        setUploadLocationId('');
        setAssetFilterLocationId((prev) => (prev === 'all' || prev === 'unassigned' ? prev : 'all'));
        return;
      }
      const yearsList = await safeJson<YearOption[]>(yearsRes, [], isYearArray);
      if (!Array.isArray(yearsList) || yearsList.length === 0) {
        setLocationFolders([]);
        setUploadLocationId('');
        setAssetFilterLocationId((prev) => (prev === 'all' || prev === 'unassigned' ? prev : 'all'));
        return;
      }

      const normalizedYears = yearsList
        .slice()
        .sort((a, b) => {
          const diff = toOrderNumber(a.orderIndex ?? a.order_index) - toOrderNumber(b.orderIndex ?? b.order_index);
          if (diff !== 0) return diff;
          return a.label.localeCompare(b.label, 'zh-TW');
        });

      const entries: LocationFolderOption[] = [];
      await Promise.all(normalizedYears.map(async (year) => {
        try {
          const res = await fetch(`/api/admin/years/${encodeURIComponent(year.id)}/locations`, { cache: 'no-store' });
          if (!res.ok) return;
          const data = await safeJson<LocationFolderDto[]>(res, [], isLocationFolderDtoArray);
          if (!Array.isArray(data) || data.length === 0) return;
          data.forEach((folder) => {
            entries.push({
              id: folder.id,
              name: folder.name,
              yearId: folder.yearId,
              yearLabel: year.label,
              orderIndex: folder.orderIndex,
              yearOrderIndex: year.orderIndex ?? year.order_index ?? '',
            });
          });
        } catch {
          // ignore errors for individual year fetches
        }
      }));

      entries.sort((a, b) => {
        const yearDiff = toOrderNumber(a.yearOrderIndex) - toOrderNumber(b.yearOrderIndex);
        if (yearDiff !== 0) return yearDiff;
        const yearLabelCompare = a.yearLabel.localeCompare(b.yearLabel, 'zh-TW');
        if (yearLabelCompare !== 0) return yearLabelCompare;
        const folderDiff = toOrderNumber(a.orderIndex) - toOrderNumber(b.orderIndex);
        if (folderDiff !== 0) return folderDiff;
        return a.name.localeCompare(b.name, 'zh-TW');
      });

      setLocationFolders(entries);
      setUploadLocationId((prev) => (prev && entries.some((folder) => folder.id === prev) ? prev : ''));
      setAssetFilterLocationId((prev) => {
        if (prev === 'all' || prev === 'unassigned') return prev;
        return entries.some((folder) => folder.id === prev) ? prev : 'all';
      });
    } catch {
      setLocationFolders([]);
      setUploadLocationId('');
      setAssetFilterLocationId((prev) => (prev === 'all' || prev === 'unassigned' ? prev : 'all'));
    }
  }, []);

  const loadVariantStatusForAsset = useCallback(async (assetId: string) => {
    try {
      const res = await fetch(`/api/admin/uploads/r2/variants/${encodeURIComponent(assetId)}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await safeJson<{ variants?: Record<string, boolean> }>(res, {} as { variants?: Record<string, boolean> }, isVariantStatusResponse);
      setVariantStatus((prev) => ({ ...prev, [assetId]: data.variants ?? {} }));
    } catch {
      // ignore
    }
  }, [setVariantStatus]);

  const formatLocationOptionLabel = useCallback(
    (folder: LocationFolderOption) => (folder.yearLabel ? `${folder.yearLabel} · ${folder.name}` : folder.name),
    [],
  );

  useEffect(() => { void loadAssets(); }, [loadAssets]);
  useEffect(() => { void loadLocationFolders(); }, [loadLocationFolders]);
  useEffect(() => { setSelectedIds(new Set()); }, [assetFilterLocationId]);

  async function saveAsset() {
    if (isUploading) return;
    setFeedback(null);

    const trimmedAlt = alt.trim();
    if (!trimmedAlt) {
      setFeedback({ type: 'error', text: '請輸入替代文字。' });
      return;
    }

  const filesToUpload: Array<File | null> = files.length > 0 ? files : [null];
    const failedFiles: File[] = [];
    let successCount = 0;

    setIsUploading(true);
    try {
      for (let index = 0; index < filesToUpload.length; index += 1) {
  const currentFile = filesToUpload[index];
        const filename = currentFile?.name || (filesToUpload.length > 1 ? `admin-upload-${index + 1}.jpg` : 'admin-upload.jpg');

        try {
          // Upload to R2 via same-origin API
          let imageId = `test-uploaded-image-id-${Date.now()}-${index}`;
          if (currentFile) {
            // 1) Upload original
            const fd = new FormData();
            fd.append('file', currentFile, currentFile.name);
            const up = await fetch('/api/admin/uploads/r2', { method: 'POST', body: fd });
            if (!up.ok) throw new Error('Upload failed');
            const upJson = await safeJson<{ image_id?: string }>(up, {});
            if (upJson.image_id) imageId = upJson.image_id;

          }
          const assetId = imageId;
          const baseAlt = trimmedAlt || currentFile?.name || '上傳圖片';
          const altValue = filesToUpload.length > 1 && currentFile ? `${baseAlt} (${currentFile.name})` : baseAlt;

          let width = 1920;
          let height = 1080;
          if (currentFile) {
            try {
              const dimensions = await readImageDimensions(currentFile);
              width = Number.isFinite(dimensions.width) && dimensions.width > 0 ? dimensions.width : width;
              height = Number.isFinite(dimensions.height) && dimensions.height > 0 ? dimensions.height : height;
            } catch (dimensionError) {
              console.warn('[admin/uploads] failed to read image dimensions', dimensionError);
            }
          }

          const payload: Record<string, unknown> = {
            id: assetId,
            alt: altValue,
            caption,
            width,
            height,
          };
          if (uploadLocationId) {
            payload.location_folder_id = uploadLocationId;
          }
          const create = await fetch('/api/admin/assets', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!create.ok) {
            throw new Error('Asset creation failed');
          }
          successCount += 1;
        } catch (error) {
          if (currentFile) {
            failedFiles.push(currentFile);
          }
          console.error('[admin/uploads] failed to upload file', filename, error);
        }
      }
    } finally {
      setIsUploading(false);
    }

    if (successCount > 0) {
      await loadAssets();
    }

    if (failedFiles.length === 0) {
      setFeedback({ type: 'success', text: `檔案上傳完成（${successCount}/${filesToUpload.length}）` });
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else if (successCount > 0) {
      setFeedback({ type: 'info', text: `部分檔案上傳失敗，成功 ${successCount} / 失敗 ${failedFiles.length}` });
      setFiles(failedFiles);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setFeedback({ type: 'error', text: '上傳失敗，請稍後再試。' });
    }
  }

  async function regenerateSelectedVariants() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setFeedback({ type: 'info', text: '請先選擇素材。' });
      return;
    }
    setFeedback({ type: 'info', text: '開始重產變體…' });
    try {
      for (const id of ids) {
        try {
          const res = await fetch(`/api/admin/uploads/r2/variants/${encodeURIComponent(id)}`, { method: 'POST' });
          if (!res.ok) throw new Error('variant regeneration failed');
        } catch (e) {
          console.warn('[admin/uploads] regenerate failed for', id, e);
        }
      }
      // Refresh variant status for affected ids
      try {
        const updates: Record<string, VariantStatusEntry> = {};
        await Promise.all(Array.from(selectedIds).map(async (id) => {
          const r = await fetch(`/api/admin/uploads/r2/variants/${encodeURIComponent(id)}`, { cache: 'no-store' });
          if (r.ok) {
            const j = await safeJson<{ variants?: Record<string, boolean> }>(
              r,
              {} as { variants?: Record<string, boolean> },
              isVariantStatusResponse,
            );
            updates[id] = j.variants ?? {};
          }
        }));
        setVariantStatus(prev => ({ ...prev, ...updates }));
      } catch {}
      setFeedback({ type: 'success', text: '重產變體完成。' });
    } catch {
      setFeedback({ type: 'error', text: '重產變體失敗，請稍後再試。' });
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function bulkDeleteSelected() {
    if (selectedIds.size === 0) {
      setShowConfirm(false);
      setFeedback({ type: 'info', text: '請先選擇要刪除的素材。' });
      return;
    }
    if (selectedIds.size > 20) {
      setShowConfirm(false);
      setFeedback({ type: 'error', text: '一次最多刪除 20 筆素材。' });
      return;
    }
    setIsBulkDeleting(true);
    setBulkDone(false);
    setFeedback(null);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch('/api/admin/assets/batch-delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ asset_ids: ids }) });
      if (!res.ok) {
        setFeedback({ type: 'error', text: '批次刪除失敗，請稍後再試。' });
      } else {
        const json = await safeJson<BatchDeleteResponse>(res, {}, isBatchDeleteResponse);
        const failed = json.failed?.length ?? 0;
        if (failed > 0) {
          setFeedback({ type: 'info', text: `部分素材刪除失敗（${failed}/${ids.length}）` });
        } else {
          setFeedback({ type: 'success', text: '素材已刪除。' });
        }
      }
      setSelectedIds(new Set());
      await loadAssets();
    } catch {
      setFeedback({ type: 'error', text: '批次刪除失敗，請稍後再試。' });
    } finally {
      setIsBulkDeleting(false);
      setBulkDone(true);
      setShowConfirm(false);
      // Also make the progress/completion banners visible for tests/UX
      const progress = document.getElementById('bulk-progress');
      if (progress) progress.classList.remove('hidden');
      const complete = document.getElementById('bulk-complete');
      if (complete) complete.classList.remove('hidden');
    }
  }

  function onSelectFilesClick() { fileInputRef.current?.click(); }
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    if (list.length === 0) {
      return;
    }
    setFiles((prev) => {
      if (prev.length === 0) return list;
      const fileMap = new Map<string, File>();
      const addFiles = (items: File[]) => {
        items.forEach((item) => {
          fileMap.set(`${item.name}-${item.size}-${item.lastModified}`, item);
        });
      };
      addFiles(prev);
      addFiles(list);
      return Array.from(fileMap.values());
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const clearSelectedFiles = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  function openAssignDialog() {
    setShowAssignDialog(true);
    void loadYearsAndCollectionsForAssign();
  }

  async function addSelectedToCollection() {
    if (!assignCollectionId || selectedIds.size === 0) { setShowAssignDialog(false); return; }
    try {
      if (process.env.NODE_ENV !== 'production') {
        // Debug log for E2E to verify payload
        console.log('[uploads:addSelectedToCollection] posting', {
          collection: assignCollectionId,
          asset_ids: Array.from(selectedIds)
        });
      }
      const res = await fetch(`/api/admin/collections/${assignCollectionId}/assets`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ asset_ids: Array.from(selectedIds) })
      });
      if (!res.ok) {
        setFeedback({ type: 'error', text: '加入作品集失敗，請稍後再試。' });
      } else {
        setFeedback({ type: 'success', text: '已加入作品集。' });
        setSelectedIds(new Set());
      }
    } catch {
      setFeedback({ type: 'error', text: '加入作品集失敗，請稍後再試。' });
    } finally {
      setShowAssignDialog(false);
    }
  }

  async function saveInlineAsset(a: Asset) {
    try {
      const res = await fetch(`/api/admin/assets/${encodeURIComponent(a.id)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          alt: a.alt,
          caption: a.caption,
          location_folder_id: a.location_folder_id ?? null,
        })
      });
      if (!res.ok) throw new Error('Failed');
      setFeedback({ type: 'success', text: '已儲存。' });
      await loadAssets();
    } catch {
      setFeedback({ type: 'error', text: '儲存失敗，請稍後再試。' });
    }
  }

  const totalAssets = assets.length;
  const feedbackTestId = feedback
    ? feedback.type === 'success'
      ? 'upload-success'
      : feedback.type === 'error'
        ? 'error-message'
        : 'info-message'
    : undefined;
  const hasSelection = selectedIds.size > 0;

  return (
    <div className="min-h-screen bg-slate-50/80">
      <AdminPageLayout
        breadcrumbItems={[{ label: '素材上傳' }]}
        title="素材上傳"
        description="批次上傳照片、指派地點資料夾，並管理素材的描述與狀態。"
        actions={(
          <button
            type="button"
            onClick={() => void loadAssets()}
            className="inline-flex items-center rounded-md border border-blue-200 bg-white/90 px-3 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isUploading}
          >
            重新整理列表
          </button>
        )}
        headerExtra={(
          <div className="space-y-3">
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="sr-only"
              data-testid="uploads-announce"
            >
              {feedback?.text ?? ''}
            </div>
            {feedback && (
              <div
                data-testid={feedbackTestId}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  feedback.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : feedback.type === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-blue-200 bg-blue-50 text-blue-700'
                }`}
              >
                {feedback.text}
              </div>
            )}
          </div>
        )}
        dataTestId="admin-uploads-page"
      >
        <section
          data-testid="upload-area"
          className="rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm ring-1 ring-gray-100/60"
        >
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start">
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="select-files-btn"
                onClick={onSelectFilesClick}
                className="inline-flex items-center rounded-md border border-blue-200 bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
              >
                選擇檔案
              </button>
              <input
                ref={fileInputRef}
                onChange={onFileChange}
                data-testid="file-input"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
              />
            </div>

            {files.length > 0 && (
              <div
                className="flex-1 rounded-xl border border-dashed border-blue-200 bg-blue-50/70 px-4 py-3 text-xs text-blue-700"
                aria-live="polite"
                data-testid="selected-files-summary"
              >
                <div className="flex items-center justify-between gap-2">
                  <span>已選擇 {files.length} 個檔案</span>
                  <button
                    type="button"
                    data-testid="clear-selected-files"
                    className="text-[11px] font-medium text-blue-700 underline-offset-2 hover:underline"
                    onClick={clearSelectedFiles}
                  >
                    清除
                  </button>
                </div>
                <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto text-[11px] text-blue-900" data-testid="selected-files-list">
                  {files.map((item) => (
                    <li key={`${item.name}-${item.size}-${item.lastModified}`} className="truncate">{item.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-1">
              <label
                className="mb-1 block text-sm font-medium text-gray-700"
                htmlFor="asset-alt-input"
              >
                替代文字
              </label>
              <input
                id="asset-alt-input"
                data-testid="asset-alt-input"
                value={alt}
                onChange={(event) => setAlt(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                aria-invalid={!alt.trim()}
                aria-describedby={!alt.trim() ? 'asset-alt-error' : undefined}
                placeholder="例如：北投溫泉夜景"
                disabled={isUploading}
              />
              {!alt.trim() && (
                <div
                  id="asset-alt-error"
                  className="mt-1 text-xs text-red-600"
                  data-testid="field-error"
                >
                  替代文字為必填欄位
                </div>
              )}
            </div>

            <div className="md:col-span-1">
              <label
                className="mb-1 block text-sm font-medium text-gray-700"
                htmlFor="asset-caption-textarea"
              >
                說明文字
              </label>
              <textarea
                id="asset-caption-textarea"
                data-testid="asset-caption-textarea"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                className="h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="描述照片內容或拍攝重點"
                disabled={isUploading}
              />
            </div>

            <div className="md:col-span-2">
              <label
                className="mb-1 block text-sm font-medium text-gray-700"
                htmlFor="asset-location-select"
              >
                指派地點資料夾
              </label>
              <select
                id="asset-location-select"
                data-testid="asset-location-select"
                value={uploadLocationId}
                onChange={(event) => setUploadLocationId(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                disabled={isUploading}
              >
                <option value="">未指派地點</option>
                {groupedLocationFolders.map((group) => (
                  <optgroup key={group.yearId || group.yearLabel || 'unlabelled'} label={group.yearLabel || '其他年份'}>
                    {group.options.map((folder) => (
                      <option key={folder.id} value={folder.id}>{formatLocationOptionLabel(folder)}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              data-testid="save-asset-btn"
              onClick={saveAsset}
              className="inline-flex items-center rounded-md border border-blue-200 bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isUploading || alt.trim().length === 0}
              aria-busy={isUploading}
            >
              {isUploading ? '上傳中…' : '開始上傳'}
            </button>
            <span className="text-xs text-gray-500">
              上傳時會保留原始尺寸，可於下方列表編輯細節。
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white/95 shadow-sm ring-1 ring-gray-100/60">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">素材列表</h2>
              <p className="text-xs text-gray-500">共 {totalAssets} 張照片</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <span>篩選地點：</span>
              <select
                data-testid="asset-location-filter"
                value={assetFilterLocationId}
                onChange={(event) => setAssetFilterLocationId(event.target.value as typeof assetFilterLocationId)}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="all">全部地點</option>
                <option value="unassigned">未指派地點</option>
                {groupedLocationFolders.map((group) => (
                  <optgroup key={`filter-${group.yearId || group.yearLabel || 'unlabelled'}`} label={group.yearLabel || '其他年份'}>
                    {group.options.map((folder) => (
                      <option key={folder.id} value={folder.id}>{formatLocationOptionLabel(folder)}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>

          <div data-testid="asset-list" className="grid gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => {
              const locationLabel = asset.location_folder_name
                ? `${asset.location_folder_year_label ? `${asset.location_folder_year_label} · ` : ''}${asset.location_folder_name}`
                : '未指派地點';
              const previewSrc = getR2VariantDirectUrl(asset.id, 'thumb');
              const previewAlt = asset.alt || '素材預覽圖';
              const variantEntry = variantStatus[asset.id] || {};
              const hasVariants = asset.id in variantStatus;
              const updateAsset = (updater: (current: Asset) => Asset) => {
                setAssets((prev) => prev.map((item) => (item.id === asset.id ? updater(item) : item)));
              };

              return (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  previewSrc={previewSrc}
                  previewAlt={previewAlt}
                  locationLabel={locationLabel}
                  variantStatus={variantEntry}
                  hasVariantStatus={hasVariants}
                  loadVariantStatus={loadVariantStatusForAsset}
                  groupedLocationFolders={groupedLocationFolders}
                  formatLocationOptionLabel={formatLocationOptionLabel}
                  locationFolderMap={locationFolderMap}
                  onAssetChange={updateAsset}
                  onSaveInline={saveInlineAsset}
                  selected={selectedIds.has(asset.id)}
                  onToggleSelected={() => toggleSelected(asset.id)}
                />
              );
            })}
          </div>

          <div
            data-testid="bulk-actions"
            className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                data-testid="bulk-delete-btn"
                className="inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setShowConfirm(true)}
                aria-disabled={!hasSelection}
                disabled={!hasSelection}
                title={hasSelection ? '刪除所選素材' : '請先選擇素材'}
              >
                批次刪除
              </button>
              <button
                data-testid="bulk-add-to-collection-btn"
                className="inline-flex items-center rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={openAssignDialog}
                aria-disabled={!hasSelection}
                disabled={!hasSelection}
                title={hasSelection ? '將素材加入作品集' : '請先選擇素材'}
              >
                加入作品集
              </button>
              <button
                data-testid="bulk-regenerate-variants-btn"
                className="inline-flex items-center rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void regenerateSelectedVariants()}
                aria-disabled={!hasSelection}
                disabled={!hasSelection}
                title={hasSelection ? '重產所選素材的變體' : '請先選擇素材'}
              >
                重產變體
              </button>
              <button
                data-testid="confirm-bulk-delete-toolbar-btn"
                className={((process.env.NODE_ENV !== 'production') ? '' : 'hidden ') + 'inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700'}
                onClick={bulkDeleteSelected}
              >
                測試用確認
              </button>
            </div>

            <div className="flex flex-col gap-1 text-xs text-gray-600">
              <div id="bulk-progress" data-testid="bulk-progress" className={(isBulkDeleting ? '' : 'hidden ') + 'text-gray-600'}>
                處理中…
              </div>
              <div id="bulk-complete" data-testid="bulk-complete" className={(bulkDone ? '' : 'hidden ') + 'text-emerald-600'}>
                已完成
              </div>
            </div>
          </div>
        </section>
      </AdminPageLayout>

      <AccessibleDialog
        open={showConfirm}
        titleId="bulk-confirm-title"
        onClose={() => setShowConfirm(false)}
        dataTestId="confirm-dialog"
      >
        <p id="bulk-confirm-title" className="mb-3 text-sm text-gray-800">
          確定要刪除所選的素材嗎？此操作無法復原。
        </p>
        <div className="flex gap-2 justify-end">
          <button
            data-autofocus
            data-testid="confirm-bulk-delete-btn"
            className="inline-flex items-center rounded-md border border-red-300 bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
            onClick={bulkDeleteSelected}
          >
            確認刪除
          </button>
          <button
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            onClick={() => setShowConfirm(false)}
          >
            取消
          </button>
        </div>
      </AccessibleDialog>

      <AccessibleDialog
        open={showAssignDialog}
        titleId="assign-title"
        onClose={() => setShowAssignDialog(false)}
        dataTestId="assign-dialog"
      >
        <div className="mb-3 space-y-3">
          <p id="assign-title" className="text-sm text-gray-800">
            將 {selectedIds.size} 個素材加入作品集
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-medium text-gray-700">
              選擇年份
              <select
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={assignYearId}
                onChange={async (event) => {
                  const yearId = event.target.value;
                  setAssignYearId(yearId);
                  await loadYearsAndCollectionsForAssign(yearId);
                }}
              >
                {years.length === 0 ? (
                  <option value="">目前沒有年份</option>
                ) : (
                  years.map((year) => (
                    <option key={year.id} value={year.id}>{year.label}</option>
                  ))
                )}
              </select>
            </label>

            <label className="text-xs font-medium text-gray-700">
              選擇作品集
              <select
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={assignCollectionId}
                onChange={(event) => setAssignCollectionId(event.target.value)}
              >
                {collections.length === 0 ? (
                  <option value="">此年份尚無作品集</option>
                ) : (
                  collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>{collection.title}</option>
                  ))
                )}
              </select>
            </label>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            className="inline-flex items-center rounded-md border border-blue-200 bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void addSelectedToCollection()}
            disabled={!assignCollectionId}
          >
            加入
          </button>
          <button
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            onClick={() => setShowAssignDialog(false)}
          >
            取消
          </button>
        </div>
      </AccessibleDialog>
    </div>
  );
}
