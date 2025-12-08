"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';

import AccessibleDialog from '@/components/ui/AccessibleDialog';
import { useToast } from '@/components/admin/Toast';

import type { AdminLocation } from '../locations/Form';
import CoverAssetPicker from '../components/CoverAssetPicker';
import type { AdminCollectionSummary } from './AssignLocation';
import PhotoManager from './PhotoManager';

interface AdminCollectionDetail extends AdminCollectionSummary {
  summary: string | null;
  coverAssetId: string | null;
}

interface CollectionManagerProps {
  yearId: string | null;
  yearLabel: string | null;
  locations: AdminLocation[];
  activeLocation?: AdminLocation | null;
  onCollectionMutated: () => void;
  onCollectionRemoved?: (collection: AdminCollectionSummary) => void;
  onCollectionCreated?: (collection: AdminCollectionSummary) => void;
  refreshKey?: number | string;
}

type CollectionFormPayload = {
  slug: string;
  title: string;
  summary?: string;
  status: 'draft' | 'published';
  updated_at?: string;
  location_id?: string;
  cover_asset_id?: string | null;
};

type CollectionRecord = {
  id: string;
  year_id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: 'draft' | 'published';
  location_id: string | null;
  order_index: string | null;
  updated_at: string | null;
  cover_asset_id: string | null;
};

type CollectionFormState = {
  slug: string;
  title: string;
  summary?: string;
  status: 'draft' | 'published';
  updated_at?: string;
  cover_asset_id?: string | null;
};

const isCollectionArray = (value: unknown): value is CollectionRecord[] =>
  Array.isArray(value) &&
  value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const obj = item as Partial<CollectionRecord>;
    return (
      typeof obj.id === 'string' &&
      typeof obj.year_id === 'string' &&
      typeof obj.slug === 'string' &&
      typeof obj.title === 'string' &&
      (obj.status === 'draft' || obj.status === 'published')
    );
  });

const isCollectionRecord = (value: unknown): value is CollectionRecord =>
  Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as Partial<CollectionRecord>).id === 'string' &&
      typeof (value as Partial<CollectionRecord>).year_id === 'string' &&
      typeof (value as Partial<CollectionRecord>).slug === 'string' &&
      typeof (value as Partial<CollectionRecord>).title === 'string' &&
      (((value as Partial<CollectionRecord>).status as CollectionRecord['status']) === 'draft' ||
        ((value as Partial<CollectionRecord>).status as CollectionRecord['status']) === 'published'),
  );

async function safeJson<T>(res: Response, fallback: T, validate?: (value: unknown) => value is T): Promise<T> {
  try {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return fallback;
    const text = await res.text();
    if (!text) return fallback;
    const parsed: unknown = JSON.parse(text);
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit, retries = 2, backoffMs = 200): Promise<Response> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(input, init);
      return res;
    } catch (error) {
      lastErr = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Fetch failed');
}

const normalize = (record: CollectionRecord): AdminCollectionDetail => ({
  id: record.id,
  yearId: record.year_id,
  title: record.title,
  slug: record.slug,
  status: record.status,
  locationId: record.location_id,
  orderIndex: record.order_index ?? null,
  updatedAt: record.updated_at ?? null,
  summary: record.summary,
  coverAssetId: record.cover_asset_id,
});

const toSummary = (record: CollectionRecord): AdminCollectionSummary => ({
  id: record.id,
  yearId: record.year_id,
  title: record.title,
  slug: record.slug,
  status: record.status,
  locationId: record.location_id,
  orderIndex: record.order_index ?? null,
  updatedAt: record.updated_at ?? null,
});

const normalizeSlugValue = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const deriveSlugFromTitle = (title: string): string => normalizeSlugValue(title);

const isErrorPayload = (value: unknown): value is { message?: string; error?: string } =>
  Boolean(
    value &&
      typeof value === 'object' &&
      ('message' in (value as Record<string, unknown>) || 'error' in (value as Record<string, unknown>)),
  );

export default function CollectionManager({
  yearId,
  yearLabel,
  locations,
  activeLocation = null,
  onCollectionMutated,
  onCollectionRemoved,
  onCollectionCreated,
  refreshKey,
}: CollectionManagerProps) {
  const [collections, setCollections] = useState<AdminCollectionDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminCollectionDetail | null>(null);
  const [form, setForm] = useState<CollectionFormState>({ slug: '', title: '', status: 'draft', cover_asset_id: null });
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [photoManagerCollection, setPhotoManagerCollection] = useState<AdminCollectionDetail | null>(null);
  const [liveText, setLiveText] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const toast = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const locationsMap = useMemo(() => new Map(locations.map((loc) => [loc.id, loc.name])), [locations]);
  const activeLocationId = activeLocation?.id ?? null;
  const visibleCollections = useMemo(
    () => (activeLocationId ? collections.filter((item) => item.locationId === activeLocationId) : collections),
    [collections, activeLocationId],
  );
  const isFilteringByLocation = Boolean(activeLocationId);
  const unassignedCount = useMemo(() => collections.filter((item) => !item.locationId).length, [collections]);
  const otherLocationsCount = useMemo(
    () =>
      activeLocationId
        ? collections.filter((item) => item.locationId && item.locationId !== activeLocationId).length
        : 0,
    [collections, activeLocationId],
  );

  const loadCollections = useCallback(async () => {
    if (!yearId) {
      setCollections([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithRetry(`/api/admin/years/${encodeURIComponent(yearId)}/collections?status=all`, { cache: 'no-store' }, 1);
      const data = await safeJson<CollectionRecord[]>(res, [], isCollectionArray);
      if (!res.ok) {
        throw new Error('Failed to load collections');
      }
      setCollections(data.map(normalize));
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Failed to load collections';
      setCollections([]);
      setMessage({ type: 'error', text });
      toast.error(text);
    } finally {
      setLoading(false);
    }
  }, [yearId, toast]);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections, refreshKey]);

  const resetForm = () => {
    setForm({ slug: '', title: '', summary: '', status: 'draft', updated_at: '', cover_asset_id: null });
    setSlugTouched(false);
  };

  const startCreate = () => {
    setEditing(null);
    resetForm();
    setShowForm(true);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const input = formRef.current?.querySelector('#collection-title-input') as HTMLInputElement | null;
      input?.focus();
    });
  };

  const startEdit = (collection: AdminCollectionDetail) => {
    setEditing(collection);
    setForm({
      slug: collection.slug,
      title: collection.title,
      summary: collection.summary ?? '',
      status: collection.status,
      updated_at: collection.updatedAt ? new Date(collection.updatedAt).toISOString().split('T')[0] : '',
      cover_asset_id: collection.coverAssetId ?? null,
    });
    setSlugTouched(true);
    setShowForm(true);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const input = formRef.current?.querySelector('#collection-title-input') as HTMLInputElement | null;
      input?.focus();
    });
  };

  const ensureOk = async (res: Response, fallbackMessage: string) => {
    if (res.ok) return;
    const payload = await safeJson<{ message?: string; error?: string }>(res, {}, isErrorPayload);
    const detail = payload?.message || payload?.error;
    throw new Error(detail || fallbackMessage);
  };

  const saveCollection = async () => {
    setMessage(null);
    if (!yearId) {
      setMessage({ type: 'error', text: '請先建立或選擇年份。' });
      return;
    }
    if (!form.slug || !form.title) {
      setMessage({ type: 'error', text: 'Slug 與 Title 皆為必填。' });
      return;
    }

    try {
      const payload: CollectionFormPayload = { ...form };
      if (!payload.summary) delete payload.summary;
      if (!payload.updated_at) delete payload.updated_at;
  if (payload.cover_asset_id === undefined) payload.cover_asset_id = null;

      let createdRecord: CollectionRecord | null = null;

      if (editing) {
        const res = await fetch(`/api/admin/collections/${editing.id}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        await ensureOk(res, '更新失敗');
      } else {
        const existing = collections.find((c) => c.slug === form.slug);
        if (existing) {
          const res = await fetch(`/api/admin/collections/${existing.id}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          });
          await ensureOk(res, '更新失敗');
        } else {
          if (activeLocationId) {
            payload.location_id = activeLocationId;
          }
          const res = await fetch(`/api/admin/years/${encodeURIComponent(yearId)}/collections`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const clone = res.clone();
          if (!res.ok) {
            const info = await safeJson<{ message?: string; error?: string }>(clone, {});
            throw new Error(info?.message || info?.error || '建立失敗');
          }
          createdRecord = await safeJson<CollectionRecord | null>(res, null, isCollectionRecord);
          if (!createdRecord) {
            throw new Error('建立作品集的回應格式不正確。');
          }
        }
      }

      setMessage({ type: 'success', text: '已儲存作品集。' });
      setShowForm(false);
      setEditing(null);
      resetForm();
      await loadCollections();
      onCollectionMutated();
      if (createdRecord && onCollectionCreated) {
        onCollectionCreated(toSummary(createdRecord));
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : '儲存失敗';
      setMessage({ type: 'error', text });
      toast.error(text);
    }
  };

  const deleteCollection = async (id: string) => {
    setMessage(null);
    const target = collections.find((item) => item.id === id) ?? null;
    try {
      const res = await fetch(`/api/admin/collections/${id}`, { method: 'DELETE' });
      if (res.status !== 204) {
        const info = await safeJson<{ message?: string; error?: string }>(res, {});
        throw new Error(info.message || info.error || '刪除失敗');
      }
      setMessage({ type: 'success', text: '已刪除作品集。' });
      await loadCollections();
      onCollectionMutated();
      if (target && onCollectionRemoved) {
        onCollectionRemoved(target);
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : '刪除失敗';
      setMessage({ type: 'error', text });
      toast.error(text);
    }
  };

  const moveCollection = async (collectionId: string, delta: -1 | 1) => {
    const currentIndex = collections.findIndex((item) => item.id === collectionId);
    if (currentIndex < 0) return;

    let targetNeighborId: string | null = null;

    if (activeLocationId) {
      const grouped = collections.filter((item) => item.locationId === activeLocationId);
      const groupIndex = grouped.findIndex((item) => item.id === collectionId);
      if (groupIndex < 0) return;
      const neighbor = grouped[groupIndex + delta];
      if (!neighbor) return;
      targetNeighborId = neighbor.id;
    } else {
      const neighbor = collections[currentIndex + delta];
      if (!neighbor) return;
      targetNeighborId = neighbor.id;
    }

    const ordered = [...collections];
    const [moved] = ordered.splice(currentIndex, 1);
    let insertionIndex = ordered.findIndex((item) => item.id === targetNeighborId);
    if (insertionIndex < 0) return;
    if (delta === 1) {
      insertionIndex += 1;
    }
    ordered.splice(insertionIndex, 0, moved);
    const updates = ordered.map((item, idx) => ({ id: item.id, order_index: String(idx + 1).padStart(6, '0') }));

    try {
      const results = await Promise.all(
        updates.map((u) =>
          fetch(`/api/admin/collections/${u.id}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ order_index: u.order_index }),
          }),
        ),
      );
      if (!results.every((res) => res.ok)) throw new Error('排序失敗');
      setMessage({ type: 'success', text: activeLocation ? `作品集排序已更新（${activeLocation.name}）。` : '作品集排序已更新。' });
      const locationLabel = activeLocation ? ` in ${activeLocation.name}` : '';
      setLiveText(`Reordered collection: ${moved.title}${locationLabel}`);
      await loadCollections();
      onCollectionMutated();
    } catch (error) {
      const text = error instanceof Error ? error.message : '排序失敗';
      setMessage({ type: 'error', text });
      setLiveText('Reorder failed');
      toast.error(text);
    }
  };

  const onCollectionKeyDown = (event: ReactKeyboardEvent<HTMLLIElement>, collectionId: string) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      void moveCollection(collectionId, -1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      void moveCollection(collectionId, 1);
    }
  };

  if (!yearId) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600" data-testid="collection-manager-empty">
        請先選擇左側年份後再進行作品集管理。
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="collection-manager">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-medium text-gray-900">作品集管理</h2>
            <p className="text-sm text-gray-600">建立、編輯並排序此年份的作品集。</p>
            {yearLabel && <p className="text-xs text-gray-500">年份：{yearLabel}</p>}
          </div>
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            onClick={startCreate}
            data-testid="create-collection-btn"
          >
            新增作品集
          </button>
        </div>
        <div role="status" aria-live="polite" aria-atomic="true" data-testid="collection-announce" className="sr-only">
          {liveText}
        </div>
        {message && (
          <div
            data-testid={message.type === 'success' ? 'success-message' : 'error-message'}
            className={message.type === 'success' ? 'text-green-600' : 'text-red-600'}
          >
            {message.text}
          </div>
        )}

        {locations.length > 0 && (
          activeLocation ? (
            <div
              className="rounded-md border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-800"
              data-testid="collection-location-summary"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-blue-900">目前地點：{activeLocation.name}</p>
                  <p className="text-xs text-blue-700">slug：{activeLocation.slug}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
                  <span className="inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 font-medium text-blue-700 shadow-sm">
                    顯示 {visibleCollections.length} / 總計 {collections.length}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-blue-200 px-2 py-0.5 text-blue-700">
                    其他地點 {otherLocationsCount}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-blue-200 px-2 py-0.5 text-blue-700">
                    未指派 {unassignedCount}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600"
              data-testid="collection-location-hint"
            >
              點選上方地點即可篩選作品集；目前顯示此年份的所有 {collections.length} 個作品集，其中 {unassignedCount}
              個未指派地點。
            </div>
          )
        )}
      </div>

      {showForm && (
        <div ref={formRef} data-testid="collection-form" className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="collection-slug-input">Slug</label>
              <input
                id="collection-slug-input"
                data-testid="collection-slug-input"
                className="w-full rounded border px-2 py-1"
                value={form.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  const value = normalizeSlugValue(event.target.value);
                  setForm((prev) => ({ ...prev, slug: value }));
                }}
                aria-invalid={!form.slug}
                aria-describedby={!form.slug ? 'collection-slug-error' : undefined}
              />
              <p className="mt-1 text-xs text-gray-500">僅限小寫英數字與連字號，會自動轉換。</p>
              {!form.slug && (
                <div id="collection-slug-error" className="mt-1 text-xs text-red-600" data-testid="field-error">
                  Slug is required
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="collection-title-input">Title</label>
              <input
                id="collection-title-input"
                data-testid="collection-title-input"
                className="w-full rounded border px-2 py-1"
                value={form.title}
                onChange={(event) => {
                  const { value } = event.target;
                  setForm((prev) => {
                    const next = { ...prev, title: value };
                    if (!editing && !slugTouched) {
                      next.slug = deriveSlugFromTitle(value);
                    }
                    return next;
                  });
                }}
                aria-invalid={!form.title}
                aria-describedby={!form.title ? 'collection-title-error' : undefined}
              />
              {!form.title && (
                <div id="collection-title-error" className="mt-1 text-xs text-red-600" data-testid="field-error">
                  Title is required
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm" htmlFor="collection-summary-textarea">Summary</label>
              <textarea
                id="collection-summary-textarea"
                data-testid="collection-summary-textarea"
                className="w-full rounded border px-2 py-1"
                value={form.summary || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              {editing ? (
                <CoverAssetPicker
                  label="封面圖片（選填）"
                  description="僅顯示此作品集包含的照片，點擊即可設定封面。"
                  emptyHint="此作品集目前尚未擁有照片，請先於「Manage Photos」加入。"
                  source={{ type: 'collection', collectionId: editing.id }}
                  selectedAssetId={form.cover_asset_id ?? null}
                  onSelect={(assetId) => setForm((prev) => ({ ...prev, cover_asset_id: assetId }))}
                  className="mt-1"
                />
              ) : (
                <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
                  儲存作品集並加入照片後，即可在此選擇封面圖片。
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="collection-status-select">Status</label>
              <select
                id="collection-status-select"
                data-testid="collection-status-select"
                className="w-full rounded border px-2 py-1"
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as 'draft' | 'published' }))}
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="collection-updated-at-input">拍攝日期（選填）</label>
              <input
                type="date"
                id="collection-updated-at-input"
                data-testid="collection-updated-at-input"
                className="w-full rounded border px-2 py-1"
                value={form.updated_at || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, updated_at: event.target.value }))}
              />
              <div className="mt-1 text-xs text-gray-500">留空則使用自動產生時間。</div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              data-testid="save-collection-btn"
              className="rounded border px-3 py-2"
              onClick={() => void saveCollection()}
            >
              Save
            </button>
            <button
              type="button"
              className="rounded border px-3 py-2"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
                resetForm();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600" data-testid="collection-loading">
          載入作品集中…
        </div>
      ) : collections.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600" data-testid="collection-empty">
          尚未建立任何作品集。
        </div>
      ) : isFilteringByLocation && visibleCollections.length === 0 ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-800" data-testid="collection-empty-filtered">
          「{activeLocation?.name}」目前尚未指派任何作品集，可在下方的作品集指派區進行調整。
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleCollections.map((collection, index) => {
            const locationName = collection.locationId ? locationsMap.get(collection.locationId) ?? '未知地點' : null;
            const shouldShowLocation = !activeLocationId || collection.locationId !== activeLocationId;
            return (
              <li
                key={collection.id}
                data-testid="collection-item"
                className={`flex flex-col gap-3 rounded-lg p-4 shadow-sm transition md:flex-row md:items-start md:justify-between ${
                  isFilteringByLocation ? 'border border-blue-200 bg-blue-50/70 ring-1 ring-blue-100' : 'border border-gray-200 bg-white'
                }`}
                tabIndex={0}
                onKeyDown={(event) => onCollectionKeyDown(event, collection.id)}
              >
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-gray-900">
                    <span className="font-medium">{collection.title}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{collection.status}</span>
                  </div>
                  <div className="text-xs text-gray-500">Slug：{collection.slug}</div>
                  {shouldShowLocation && locationName && <div className="text-xs text-gray-500">目前地點：{locationName}</div>}
                  {collection.updatedAt && (
                    <div className="text-xs text-gray-500">
                      更新於 {new Date(collection.updatedAt).toLocaleDateString('zh-TW', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end">
                  <div className="flex gap-1" aria-label="reorder controls">
                    <button
                      type="button"
                      className="rounded border px-2 py-1"
                      data-testid="move-collection-up"
                      onClick={() => void moveCollection(collection.id, -1)}
                      disabled={index === 0}
                      aria-disabled={index === 0}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="rounded border px-2 py-1"
                      data-testid="move-collection-down"
                      onClick={() => void moveCollection(collection.id, 1)}
                      disabled={index === visibleCollections.length - 1}
                      aria-disabled={index === visibleCollections.length - 1}
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    className="rounded border px-2 py-1"
                    data-testid="edit-collection-btn"
                    onClick={() => startEdit(collection)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded border px-2 py-1"
                    data-testid="manage-photos-btn"
                    onClick={() => setPhotoManagerCollection(collection)}
                  >
                    Manage Photos
                  </button>
                  <button
                    type="button"
                    className="rounded border px-2 py-1"
                    data-testid="delete-collection-btn"
                    onClick={() => {
                      setConfirmId(collection.id);
                      setConfirmOpen(true);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {confirmId && (
        <AccessibleDialog
          open={confirmOpen}
          titleId="confirm-delete-collection-title"
          dataTestId="confirm-dialog"
          onClose={() => {
            setConfirmOpen(false);
            setConfirmId(null);
          }}
        >
          <p id="confirm-delete-collection-title" className="mb-3">確定要刪除此作品集嗎？</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              data-autofocus
              data-testid="confirm-delete-btn"
              className="rounded border px-3 py-2"
              onClick={() => {
                if (confirmId) void deleteCollection(confirmId);
                setConfirmId(null);
                setConfirmOpen(false);
              }}
            >
              Confirm
            </button>
            <button
              type="button"
              className="rounded border px-3 py-2"
              onClick={() => {
                setConfirmId(null);
                setConfirmOpen(false);
              }}
            >
              Cancel
            </button>
          </div>
        </AccessibleDialog>
      )}

      {photoManagerCollection && (
        <AccessibleDialog
          open={!!photoManagerCollection}
          titleId="photo-manager-title"
          dataTestId="photo-manager-dialog"
          onClose={() => setPhotoManagerCollection(null)}
        >
          <PhotoManager
            collectionId={photoManagerCollection.id}
            collectionTitle={photoManagerCollection.title}
            collectionLocationId={photoManagerCollection.locationId ?? null}
            onClose={() => setPhotoManagerCollection(null)}
            onUpdated={async () => {
              await loadCollections();
              onCollectionMutated();
            }}
          />
        </AccessibleDialog>
      )}
    </div>
  );
}
