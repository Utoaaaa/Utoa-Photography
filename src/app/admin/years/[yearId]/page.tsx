'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Breadcrumb from '@/components/admin/Breadcrumb';
import { ToastProvider, useToast } from '@/components/admin/Toast';
import type { AdminCollectionSummary } from '@/app/admin/years/[yearId]/collections/AssignLocation';
import type { AdminLocation } from './locations/Form';
import AssignmentPane from './components/AssignmentPane';
import CollectionsPane from './components/CollectionsPane';
import LocationsPane from './components/LocationsPane';
import YearSidebar from './components/YearSidebar';
import type { DetailState, YearStatus, YearSummary } from './types';

const isYearSummary = (value: unknown): value is YearSummary => {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown> & Partial<YearSummary>;

  if (typeof obj.id !== 'string' || typeof obj.label !== 'string') {
    return false;
  }

  const rawStatus = typeof obj.status === 'string' ? (obj.status.toLowerCase() as YearStatus) : null;
  if (rawStatus !== 'draft' && rawStatus !== 'published') {
    return false;
  }

  const rawOrderIndexValue = (obj as Record<string, unknown>).order_index;
  if (typeof rawOrderIndexValue !== 'string' && typeof rawOrderIndexValue !== 'number') {
    return false;
  }

  // Normalize to expected shapes for downstream consumers.
  // eslint-disable-next-line no-param-reassign
  obj.status = rawStatus;
  const normalizedOrderIndex =
    typeof rawOrderIndexValue === 'number' ? rawOrderIndexValue.toString() : rawOrderIndexValue;
  // eslint-disable-next-line no-param-reassign
  obj.order_index = normalizedOrderIndex;

  return true;
};

const isYearSummaryArray = (value: unknown): value is YearSummary[] =>
  Array.isArray(value) && value.every(isYearSummary);

const isLocationArray = (value: unknown): value is AdminLocation[] =>
  Array.isArray(value) &&
  value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const obj = item as Partial<AdminLocation>;
    return (
      typeof obj.id === 'string' &&
      typeof obj.yearId === 'string' &&
      typeof obj.name === 'string' &&
      typeof obj.slug === 'string' &&
      typeof obj.orderIndex === 'string' &&
      typeof obj.createdAt === 'string' &&
      typeof obj.updatedAt === 'string' &&
      typeof obj.collectionCount === 'number'
    );
  });

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

function normalizeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function AdminYearWorkspacePage() {
  const params = useParams<{ yearId: string }>();
  const rawParam = params?.yearId;
  const yearIdentifier = decodeURIComponent(normalizeParam(rawParam));

  const [years, setYears] = useState<YearSummary[]>([]);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [yearsError, setYearsError] = useState<string | null>(null);

  const [selectedYear, setSelectedYear] = useState<YearSummary | null>(null);
  const [detailState, setDetailState] = useState<DetailState>('idle');
  const [detailError, setDetailError] = useState<string | null>(null);

  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [isLocationFormOpen, setIsLocationFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<AdminLocation | null>(null);
  const [reorderLocationId, setReorderLocationId] = useState<string | null>(null);
  const [collectionRefreshKey, setCollectionRefreshKey] = useState(0);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    setYearsLoading(true);
    setYearsError(null);

    (async () => {
      try {
        const res = await fetchWithRetry('/api/admin/years?status=all&order=asc', { cache: 'no-store' });
        if (!active) return;
        if (!res.ok) {
          setYears([]);
          setYearsError('無法載入年份列表');
          return;
        }
        const data = await safeJson<YearSummary[]>(res, [], isYearSummaryArray);
        if (!active) return;
        setYears(data);
      } catch {
        if (!active) return;
        setYears([]);
        setYearsError('載入年份時發生錯誤');
      } finally {
        if (active) setYearsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const loadLocations = useCallback(
    async (yearId: string) => {
      if (!yearId) return;
      setLocationsLoading(true);
      setLocationsError(null);
      try {
        const res = await fetchWithRetry(`/api/admin/years/${encodeURIComponent(yearId)}/locations`, { cache: 'no-store' }, 1);
        if (res.status === 404) {
          setLocations([]);
          setLocationsError('找不到地點資料。');
          setActiveLocationId(null);
          return;
        }
        if (!res.ok) {
          setLocations([]);
          setLocationsError('無法載入地點列表。');
          setActiveLocationId(null);
          return;
        }
        const data = await safeJson<AdminLocation[]>(res, [], isLocationArray);
        setLocations(data);
        if (data.length > 0) {
          setActiveLocationId((prev) => (prev && data.some((item) => item.id === prev) ? prev : data[0]?.id ?? null));
        } else {
          setActiveLocationId(null);
        }
      } catch {
        setLocations([]);
        setLocationsError('載入地點時發生錯誤。');
        setActiveLocationId(null);
      } finally {
        setLocationsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;
    if (!yearIdentifier) {
      setSelectedYear(null);
      setDetailState('idle');
      setDetailError(null);
      return () => {
        active = false;
      };
    }

    setDetailState('loading');
    setDetailError(null);
    setSelectedYear(null);

    (async () => {
      try {
        const encodedId = encodeURIComponent(yearIdentifier);
        const res = await fetchWithRetry(`/api/admin/years/${encodedId}`, { cache: 'no-store' }, 1);
        if (!active) return;
        if (res.status === 404) {
          setDetailState('error');
          setDetailError('找不到指定的年份');
          return;
        }
        if (!res.ok) {
          setDetailState('error');
          setDetailError('無法載入年份詳情');
          return;
        }
        const data = await safeJson<YearSummary | null>(res, null, isYearSummary);
        if (!active) return;
        if (!data) {
          setDetailState('error');
          setDetailError('年份資料格式不正確');
          return;
        }
        setSelectedYear(data);
        setDetailState('idle');
      } catch (error) {
        if (!active) return;
        setDetailState('error');
        setDetailError(error instanceof Error ? error.message : '載入年份詳情時發生錯誤');
      }
    })();

    return () => {
      active = false;
    };
  }, [yearIdentifier]);

  useEffect(() => {
    if (selectedYear) {
      void loadLocations(selectedYear.id);
    } else {
      setLocations([]);
      setActiveLocationId(null);
    }
  }, [selectedYear, loadLocations]);

  const activeLocation = useMemo(
    () => (activeLocationId ? locations.find((item) => item.id === activeLocationId) ?? null : null),
    [activeLocationId, locations],
  );

  const handleCreateLocation = () => {
    setEditingLocation(null);
    setIsLocationFormOpen(true);
  };

  const handleEditLocation = (location: AdminLocation) => {
    setEditingLocation(location);
    setIsLocationFormOpen(true);
  };

  const handleLocationSaved = (location: AdminLocation) => {
    setLocations((prev) => {
      const index = prev.findIndex((item) => item.id === location.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = location;
        return next.sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));
      }
      return [...prev, location].sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));
    });
    setActiveLocationId(location.id);
    setIsLocationFormOpen(false);
    setEditingLocation(null);
    toast.success('地點資料已儲存。');
  };

  const handleDeleteLocation = async (location: AdminLocation) => {
    if (!selectedYear) return;
    try {
      const res = await fetch(`/api/admin/years/${encodeURIComponent(selectedYear.id)}/locations`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: location.id }),
      });
      if (res.status === 204) {
        setLocations((prev) => prev.filter((item) => item.id !== location.id));
        toast.success('地點已刪除。');
        setActiveLocationId((prev) => {
          if (prev !== location.id) return prev;
          const remaining = locations.filter((item) => item.id !== location.id);
          return remaining[0]?.id ?? null;
        });
        setIsLocationFormOpen(false);
        setEditingLocation(null);
      } else {
        let message = '無法刪除地點。';
        try {
          const json = (await res.json()) as { message?: string; error?: string };
          if (json?.message) message = json.message;
          else if (json?.error) message = json.error;
        } catch {
          // ignore parse errors
        }
        toast.error(message);
      }
    } catch {
      toast.error('刪除地點時發生錯誤。');
    }
  };

  const handleReorderLocation = async (location: AdminLocation, direction: 'up' | 'down') => {
    if (!selectedYear) return;
    const currentIndex = locations.findIndex((item) => item.id === location.id);
    if (currentIndex < 0) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= locations.length) return;

    const nextOrder = [...locations];
    nextOrder.splice(currentIndex, 1);
    nextOrder.splice(targetIndex, 0, location);
    const orderedIds = nextOrder.map((item) => item.id);

    setReorderLocationId(location.id);
    try {
      const res = await fetch(`/api/admin/locations/${encodeURIComponent(location.id)}/reorder`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ yearId: selectedYear.id, orderedIds }),
      });

      if (!res.ok) {
        let message = '更新排序失敗。';
        try {
          const json = (await res.json()) as { message?: string; error?: string };
          if (json?.message) message = json.message;
          else if (json?.error) message = json.error;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const data = await safeJson<AdminLocation[]>(res, [], isLocationArray);
      if (!data.length) {
        throw new Error('排序結果為空。');
      }

      setLocations(data.sort((a, b) => a.orderIndex.localeCompare(b.orderIndex)));
      setActiveLocationId(location.id);
      toast.success('排序已更新。');
      setLocationsError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : '排序時發生錯誤。';
      toast.error(message);
    } finally {
      setReorderLocationId(null);
    }
  };

  const isLocationsBusy = locationsLoading || detailState === 'loading' || reorderLocationId !== null;

  const handleAssignmentChange = useCallback(
    (collection: AdminCollectionSummary, previousLocationId: string | null) => {
      setLocations((prev) => {
        if (!prev.length) return prev;
        let changed = false;
        const next = prev.map((location) => {
          let nextCount = location.collectionCount;
          if (previousLocationId && previousLocationId !== collection.locationId && location.id === previousLocationId) {
            nextCount = Math.max(0, location.collectionCount - 1);
          }
          if (!collection.locationId && previousLocationId === location.id) {
            nextCount = Math.max(0, location.collectionCount - 1);
          }
          if (collection.locationId && location.id === collection.locationId && previousLocationId !== collection.locationId) {
            nextCount = location.collectionCount + 1;
          }
          if (nextCount !== location.collectionCount) {
            changed = true;
            return { ...location, collectionCount: nextCount };
          }
          return location;
        });
        return changed ? next : prev;
      });
      setLocationsError(null);
      setCollectionRefreshKey((prev) => prev + 1);
    },
    [],
  );

  const handleCollectionMutated = useCallback(() => {
    setCollectionRefreshKey((prev) => prev + 1);
    setLocationsError(null);
  }, []);

  const handleCollectionCreated = useCallback((collection: AdminCollectionSummary) => {
    if (!collection.locationId) return;
    setLocations((prev) =>
      prev.map((location) =>
        location.id === collection.locationId
          ? { ...location, collectionCount: location.collectionCount + 1 }
          : location,
      ),
    );
    setLocationsError(null);
  }, []);

  const handleCollectionRemoved = useCallback((collection: AdminCollectionSummary) => {
    if (!collection.locationId) return;
    setLocations((prev) =>
      prev.map((location) =>
        location.id === collection.locationId
          ? { ...location, collectionCount: Math.max(0, location.collectionCount - 1) }
          : location,
      ),
    );
  }, []);

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8 px-6 pb-12 pt-4 sm:px-8 lg:px-12" data-testid="year-workspace">
      <Breadcrumb
        items={[
          { label: 'Years', href: '/admin/years' },
          selectedYear ? { label: selectedYear.label } : { label: yearIdentifier || '選擇年份' },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">年份工作區</h1>
          <p className="mt-1 text-sm text-gray-600">在同一介面中管理地點與作品集的指派。</p>
        </div>
        <Link
          href="/admin/years"
          className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          ← 返回年份列表
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[300px,minmax(0,1fr)]">
        <aside
          className="rounded-2xl border border-gray-200 bg-white/95 shadow-sm ring-1 ring-gray-100/60 backdrop-blur"
          data-testid="years-sidebar"
        >
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700">年份</h2>
          </div>
          <YearSidebar
            years={years}
            yearsLoading={yearsLoading}
            yearsError={yearsError}
            selectedYearId={selectedYear?.id ?? null}
            currentYearIdentifier={yearIdentifier}
            onYearNavigated={() => {
              setActiveLocationId(null);
              setIsLocationFormOpen(false);
              setEditingLocation(null);
            }}
          />
        </aside>

        <div className="space-y-6" data-testid="year-detail-pane">
          <section className="rounded-2xl border border-gray-200 bg-white/95 p-7 shadow-sm ring-1 ring-gray-100/60">
            <LocationsPane
              selectedYear={selectedYear}
              detailState={detailState}
              detailError={detailError}
              locations={locations}
              locationsLoading={locationsLoading}
              locationsError={locationsError}
              activeLocationId={activeLocationId}
              isLocationFormOpen={isLocationFormOpen}
              editingLocation={editingLocation}
              reorderLocationId={reorderLocationId}
              isLocationsBusy={isLocationsBusy}
              onCreateLocation={handleCreateLocation}
              onSelectLocation={setActiveLocationId}
              onEditLocation={handleEditLocation}
              onDeleteLocation={handleDeleteLocation}
              onReorderLocation={handleReorderLocation}
              onCloseForm={() => {
                setIsLocationFormOpen(false);
                setEditingLocation(null);
              }}
              onLocationSaved={handleLocationSaved}
            />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white/95 p-7 shadow-sm ring-1 ring-gray-100/60">
            <CollectionsPane
              selectedYear={selectedYear}
              locations={locations}
              activeLocation={activeLocation}
              onCollectionMutated={handleCollectionMutated}
              onCollectionCreated={handleCollectionCreated}
              onCollectionRemoved={handleCollectionRemoved}
              refreshKey={collectionRefreshKey}
            />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white/95 p-7 shadow-sm ring-1 ring-gray-100/60">
            <AssignmentPane
              selectedYear={selectedYear}
              activeLocation={activeLocation}
              locations={locations}
              onAssignmentChange={handleAssignmentChange}
              refreshKey={collectionRefreshKey}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

export default function AdminYearWorkspacePageWithProvider() {
  return (
    <ToastProvider>
      <AdminYearWorkspacePage />
    </ToastProvider>
  );
}
