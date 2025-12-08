"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AdminLocation } from '@/app/admin/years/[yearId]/locations/Form';
import { useToast } from '@/components/admin/Toast';

export type AdminCollectionStatus = 'draft' | 'published';

export interface AdminCollectionSummary {
  id: string;
  yearId: string;
  title: string;
  slug: string;
  status: AdminCollectionStatus;
  locationId: string | null;
  orderIndex: string | null;
  updatedAt: string | null;
}

interface AssignLocationProps {
  yearId: string;
  yearLabel: string;
  activeLocation: AdminLocation;
  locations: AdminLocation[];
  onAssignmentChange: (collection: AdminCollectionSummary, previousLocationId: string | null) => void;
  refreshKey?: number | string;
}

type CollectionRecord = {
  id: string;
  year_id: string;
  title: string;
  slug: string;
  status: AdminCollectionStatus;
  location_id: string | null;
  order_index: string | null;
  updated_at: string | null;
};

type AssignmentPayload = {
  locationId?: unknown;
};

function isCollectionArray(value: unknown): value is CollectionRecord[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const obj = item as Partial<CollectionRecord>;
    return (
      typeof obj.id === 'string' &&
      typeof obj.year_id === 'string' &&
      typeof obj.title === 'string' &&
      typeof obj.slug === 'string' &&
      (obj.status === 'draft' || obj.status === 'published')
    );
  });
}

function normalizeCollection(record: CollectionRecord): AdminCollectionSummary {
  return {
    id: record.id,
    yearId: record.year_id,
    title: record.title,
    slug: record.slug,
    status: record.status,
    locationId: record.location_id,
    orderIndex: record.order_index ?? null,
    updatedAt: record.updated_at ?? null,
  };
}

function mapApiCollection(record: any): AdminCollectionSummary {
  if (record && typeof record === 'object') {
    const obj = record as Partial<AdminCollectionSummary> & {
      year_id?: string;
      location_id?: string | null;
      order_index?: string | null;
      updated_at?: string | null;
    };

    const yearId = typeof obj.yearId === 'string' ? obj.yearId : typeof obj.year_id === 'string' ? obj.year_id : '';
    const locationId =
      typeof obj.locationId === 'string'
        ? obj.locationId
        : obj.locationId === null
          ? null
          : typeof obj.location_id === 'string'
            ? obj.location_id
            : obj.location_id === null
              ? null
              : null;
    return {
      id: typeof obj.id === 'string' ? obj.id : '',
      yearId,
      title: typeof obj.title === 'string' ? obj.title : '',
      slug: typeof obj.slug === 'string' ? obj.slug : '',
      status: obj.status === 'draft' || obj.status === 'published' ? obj.status : 'draft',
      locationId,
      orderIndex: typeof obj.orderIndex === 'string' ? obj.orderIndex : typeof obj.order_index === 'string' ? obj.order_index : null,
      updatedAt:
        typeof obj.updatedAt === 'string'
          ? obj.updatedAt
          : typeof obj.updated_at === 'string'
            ? obj.updated_at
            : null,
    };
  }
  return {
    id: '',
    yearId: '',
    title: '',
    slug: '',
    status: 'draft',
    locationId: null,
    orderIndex: null,
    updatedAt: null,
  };
}

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
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(input, init);
      return res;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => {
          setTimeout(resolve, backoffMs * (attempt + 1));
        });
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Fetch failed');
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function AssignLocation({ yearId, yearLabel, activeLocation, locations, onAssignmentChange, refreshKey }: AssignLocationProps) {
  const [collections, setCollections] = useState<AdminCollectionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyCollectionId, setBusyCollectionId] = useState<string | null>(null);
  const [showTransfers, setShowTransfers] = useState(false);
  const toast = useToast();

  const locationsMap = useMemo(() => new Map(locations.map((loc) => [loc.id, loc.name])), [locations]);

  const reloadCollections = useCallback(async () => {
    if (!yearId) {
      setCollections([]);
      setError('尚未選擇年份。');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry(`/api/admin/years/${encodeURIComponent(yearId)}/collections?status=all`, { cache: 'no-store' }, 1);
      if (!res.ok) {
        const fallback = await safeJson<{ message?: string; error?: string }>(res, {});
        throw new Error(fallback?.message || fallback?.error || '無法載入作品集資料。');
      }
      const data = await safeJson<CollectionRecord[]>(res, [], isCollectionArray);
      setCollections(data.map(normalizeCollection));
    } catch (fetchError) {
      const messageText = fetchError instanceof Error ? fetchError.message : '無法載入作品集資料。';
      setCollections([]);
      setError(messageText);
      toast.error(messageText);
    } finally {
      setLoading(false);
    }
  }, [yearId, toast]);

  useEffect(() => {
    void reloadCollections();
  }, [reloadCollections, refreshKey]);

  const assignedCollections = useMemo(
    () => collections.filter((collection) => collection.locationId === activeLocation.id),
    [collections, activeLocation.id],
  );

  const unassignedCollections = useMemo(
    () => collections.filter((collection) => !collection.locationId),
    [collections],
  );

  const otherLocationCollections = useMemo(
    () => collections.filter((collection) => collection.locationId && collection.locationId !== activeLocation.id),
    [collections, activeLocation.id],
  );

  async function handleAssignment(collection: AdminCollectionSummary, targetLocationId: string | null) {
    if (!collection.id || !uuidRegex.test(collection.id)) {
      toast.error('無效的作品集 ID。');
      return;
    }

    if (targetLocationId && !uuidRegex.test(targetLocationId)) {
      toast.error('無效的地點 ID。');
      return;
    }

    if (collection.locationId === targetLocationId) {
      // No-op if nothing changed
      return;
    }

    setBusyCollectionId(collection.id);
    try {
      const res = await fetch(`/api/admin/collections/${encodeURIComponent(collection.id)}/location`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locationId: targetLocationId } satisfies AssignmentPayload),
      });

      if (!res.ok) {
        const info = await safeJson<{ message?: string; error?: string }>(res, {});
        throw new Error(info?.message || info?.error || '指派失敗。');
      }

      const updatedCollection = mapApiCollection(await res.json());
      setCollections((prev) => prev.map((item) => (item.id === updatedCollection.id ? updatedCollection : item)));
      onAssignmentChange(updatedCollection, collection.locationId);

      toast.success(
        targetLocationId
          ? `已將 ${collection.title} 指派至 ${activeLocation.name}。`
          : `已取消 ${collection.title} 的地點指派。`,
      );
    } catch (assignError) {
      const text = assignError instanceof Error ? assignError.message : '指派失敗。';
      toast.error(text);
    } finally {
      setBusyCollectionId(null);
    }
  }

  const summaryCounts = useMemo(() => {
    const total = collections.length;
    const unassigned = unassignedCollections.length;
    const activeAssigned = assignedCollections.length;
    const other = otherLocationCollections.length;
    return { total, unassigned, activeAssigned, other };
  }, [collections.length, unassignedCollections.length, assignedCollections.length, otherLocationCollections.length]);

  return (
    <div className="space-y-6" data-testid="assign-location-pane">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-gray-600">年份：{yearLabel}</p>
        <p className="text-sm text-gray-600">目前地點：<span className="font-medium text-gray-900">{activeLocation.name}</span></p>
        <div className="text-xs text-gray-500" data-testid="assignment-summary">
          總計 {summaryCounts.total} 個作品集，{summaryCounts.activeAssigned} 個屬於此地點，{summaryCounts.unassigned} 個未指派，{summaryCounts.other} 個屬於其他地點。
        </div>
      </div>

      {loading ? (
        <div className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-500" data-testid="assignment-loading">
          載入作品集中…
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700" data-testid="assignment-error">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3" data-testid="assignment-assigned">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">已指派給此地點</h3>
              <p className="text-xs text-gray-500">僅顯示屬於「{activeLocation.name}」的作品集。</p>
            </div>
            {assignedCollections.length === 0 ? (
              <div className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-600" data-testid="assignment-assigned-empty">
                目前沒有作品集指派到此地點。
              </div>
            ) : (
              <ul className="space-y-3">
                {assignedCollections.map((collection) => {
                  const isBusy = busyCollectionId === collection.id;
                  return (
                    <li
                      key={collection.id}
                      className="rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm shadow-sm"
                      data-testid="assignment-item-assigned"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-gray-900">
                            <span className="font-medium">{collection.title}</span>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{collection.status}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            指派於 {activeLocation.name}
                            {collection.updatedAt ? ` · 拍攝於 ${new Date(collection.updatedAt).toLocaleDateString('zh-TW')}` : ''}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:min-w-[180px]">
                          <button
                            type="button"
                            data-testid="assignment-remove-btn"
                            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                            onClick={() => handleAssignment(collection, null)}
                            disabled={isBusy}
                            aria-disabled={isBusy}
                          >
                            取消指派
                          </button>
                          {isBusy && <span className="text-xs text-gray-500">更新中…</span>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-3" data-testid="assignment-unassigned">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">可指派的作品集</h3>
              <p className="text-xs text-gray-500">僅顯示尚未指派地點的作品集。</p>
            </div>
            {unassignedCollections.length === 0 ? (
              <div className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-600" data-testid="assignment-unassigned-empty">
                目前沒有未指派的作品集。
              </div>
            ) : (
              <ul className="space-y-3">
                {unassignedCollections.map((collection) => {
                  const isBusy = busyCollectionId === collection.id;
                  return (
                    <li
                      key={collection.id}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm"
                      data-testid="assignment-item-unassigned"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-gray-900">
                            <span className="font-medium">{collection.title}</span>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{collection.status}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            尚未指派地點
                            {collection.updatedAt ? ` · 拍攝於 ${new Date(collection.updatedAt).toLocaleDateString('zh-TW')}` : ''}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:min-w-[220px]">
                          <button
                            type="button"
                            data-testid="assignment-assign-btn"
                            className="inline-flex items-center justify-center rounded-md border border-blue-500 bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                            onClick={() => handleAssignment(collection, activeLocation.id)}
                            disabled={isBusy}
                            aria-disabled={isBusy}
                          >
                            指派至 {activeLocation.name}
                          </button>
                          {isBusy && <span className="text-xs text-gray-500">更新中…</span>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-3" data-testid="assignment-transfer">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">其他地點的作品集</h3>
                <p className="text-xs text-gray-500">展開後可將其他地點的作品集移轉到「{activeLocation.name}」。</p>
              </div>
              <button
                type="button"
                data-testid="assignment-transfer-toggle"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                onClick={() => setShowTransfers((prev) => !prev)}
                aria-expanded={showTransfers}
              >
                {showTransfers ? '收合' : `展開 (${summaryCounts.other})`}
              </button>
            </div>
            {showTransfers && (
              <div className="space-y-3" data-testid="assignment-transfer-list">
                {otherLocationCollections.length === 0 ? (
                  <div className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-600" data-testid="assignment-transfer-empty">
                    目前沒有其他地點的作品集。
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {otherLocationCollections.map((collection) => {
                      const locationName = collection.locationId ? locationsMap.get(collection.locationId) ?? '未知地點' : '未知地點';
                      const isBusy = busyCollectionId === collection.id;
                      return (
                        <li
                          key={collection.id}
                          className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm"
                          data-testid="assignment-item-transfer"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-gray-900">
                                <span className="font-medium">{collection.title}</span>
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{collection.status}</span>
                              </div>
                              <div className="text-xs text-gray-500">目前指派於 {locationName}</div>
                            </div>
                            <div className="flex flex-col gap-2 sm:min-w-[220px]">
                              <button
                                type="button"
                                data-testid="assignment-transfer-btn"
                                className="inline-flex items-center justify-center rounded-md border border-blue-500 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:text-blue-300"
                                onClick={() => handleAssignment(collection, activeLocation.id)}
                                disabled={isBusy}
                                aria-disabled={isBusy}
                              >
                                移轉至 {activeLocation.name}
                              </button>
                              <button
                                type="button"
                                data-testid="assignment-clear-btn"
                                className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                                onClick={() => handleAssignment(collection, null)}
                                disabled={isBusy}
                                aria-disabled={isBusy}
                              >
                                清除地點
                              </button>
                              {isBusy && <span className="text-xs text-gray-500">更新中…</span>}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
