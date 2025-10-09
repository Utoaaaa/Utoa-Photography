"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Breadcrumb from '@/components/admin/Breadcrumb';

interface Asset { id: string; alt?: string | null; caption?: string | null; used?: boolean }

type CollectionAsset = { id: string; alt?: string | null; caption?: string | null; order_index: string };

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
    return (
      typeof id === 'string' &&
      (typeof alt === 'string' || alt === null || typeof alt === 'undefined') &&
      (typeof caption === 'string' || caption === null || typeof caption === 'undefined') &&
      (typeof used === 'boolean' || typeof used === 'undefined')
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
  const validMessage = typeof message === 'string' || typeof message === 'undefined';
  const validError = typeof error === 'string' || typeof error === 'undefined';
  return validMessage && validError;
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
  } catch { return fallback; }
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
  for (let attempt = 0; attempt <= retries; attempt++) {
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

export default function ManagePhotosClient({ id }: { id: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collectionAssets, setCollectionAssets] = useState<Array<{ id: string; alt?: string | null; caption?: string | null; order_index: string }>>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => { (async () => {
    if (!id) { setLoading(false); return; }
    try {
      const { ok: ok1, data } = await fetchJsonWithRetry<Asset[]>(
        '/api/assets',
        { cache: 'no-store' },
        [],
        isAssetArray,
      );
      if (!ok1) throw new Error('Failed to load assets');
      setAssets(Array.isArray(data) ? data : []);

      const { ok: ok2, data: col } = await fetchJsonWithRetry<CollectionWithAssets>(
        `/api/collections/${id}?include_assets=true`,
        { cache: 'no-store' },
        { id, assets: [] },
        isCollectionWithAssets,
      );
      if (!ok2) throw new Error('Failed to load collection');
      const list = Array.isArray(col?.assets) ? col.assets : [];
      setCollectionAssets(list.map((a) => ({ id: a.id, alt: a.alt, caption: a.caption, order_index: a.order_index })));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load assets');
    } finally { setLoading(false); }
  })(); }, [id]);

  function toggleSelect(assetId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  }

  async function reloadCollectionAssets() {
    if (!id) return;
    try {
      const { ok, data: col } = await fetchJsonWithRetry<CollectionWithAssets>(
        `/api/collections/${id}?include_assets=true`,
        { cache: 'no-store' },
        { id, assets: [] },
        isCollectionWithAssets,
      );
      if (!ok) return;
      const list = Array.isArray(col?.assets) ? col.assets : [];
      setCollectionAssets(list.map((a) => ({ id: a.id, alt: a.alt, caption: a.caption, order_index: a.order_index })));
    } catch { /* ignore */ }
  }

  async function addToCollection() {
    setMessage(null);
    const asset_ids = Array.from(selected);
    if (asset_ids.length === 0) return;
    try {
      const res = await fetch(`/api/collections/${id}/assets`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ asset_ids }) });
      if (!res.ok) {
        const body = await safeJson<ApiError>(res, {}, isApiError);
        throw new Error(body.message || body.error || 'Failed to add assets');
      }
      setMessage({ type: 'success', text: 'Added to collection' });
      setSelected(new Set());
      await reloadCollectionAssets();
    } catch (e: unknown) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to add assets' });
    }
  }

  async function removeFromCollection(assetId: string) {
    setMessage(null);
    try {
      const res = await fetch(`/api/collections/${id}/assets/${assetId}`, { method: 'DELETE' });
      if (res.status !== 204) {
        const body = await safeJson<ApiError>(res, {}, isApiError);
        throw new Error(body.message || body.error || 'Failed to remove asset');
      }
      setMessage({ type: 'success', text: 'Removed from collection' });
      await reloadCollectionAssets();
    } catch (e: unknown) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to remove asset' });
    }
  }

  async function persistReorder(list: Array<{ id: string }>) {
    const reorder = list.map((a, i) => ({ asset_id: a.id, order_index: (i + 1).toString() }));
    const res = await fetch(`/api/collections/${id}/assets`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reorder }) });
    if (!res.ok) {
      const body = await safeJson<ApiError>(res, {}, isApiError);
      throw new Error(body.message || body.error || 'Failed to reorder');
    }
  }

  async function onDropReorder(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    const items = [...collectionAssets];
    const fromIdx = items.findIndex(a => a.id === draggingId);
    const toIdx = items.findIndex(a => a.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    setCollectionAssets(items);
    try { await persistReorder(items); setMessage({ type: 'success', text: 'Photo order updated' }); }
    catch (e: unknown) { setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Reorder failed' }); }
    finally { setDraggingId(null); }
  }

  return (
    <div className="min-h-screen p-6" data-testid="photo-manager">
      <div className="max-w-5xl mx-auto">
        <Breadcrumb items={[
          { label: 'Collections', href: '/admin/collections' },
          { label: 'Manage Photos' }
        ]} />
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Manage Photos</h1>
          <Link href="/admin/collections" className="px-3 py-2 border rounded">Back</Link>
        </div>
        <div className="mb-2 text-sm text-gray-500">Collection: {id}</div>
        {error && <div className="text-red-600 mb-3" data-testid="error-message">{error}</div>}
        {message && (
          <div className={message.type === 'success' ? 'text-green-600 mb-3' : 'text-red-600 mb-3'} data-testid={message.type === 'success' ? 'success-message' : 'error-message'}>
            {message.text}
          </div>
        )}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-medium">Available assets</h2>
            <button type="button" data-testid="add-to-collection-btn" className="px-3 py-2 border rounded disabled:opacity-50" disabled={selected.size === 0} onClick={addToCollection}>Add to Collection</button>
          </div>
          <div data-testid="available-assets" className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {loading && <div>Loading assets…</div>}
            {!loading && assets.length === 0 && <div className="col-span-full text-gray-500">No assets</div>}
            {!loading && assets.map(a => {
              const isSelected = selected.has(a.id);
              return (
                <button type="button" key={a.id} data-testid="asset-card" className={`border rounded p-3 text-left focus:outline-none focus:ring ${isSelected ? 'ring-2 ring-blue-500' : ''}`} aria-pressed={isSelected} onClick={() => toggleSelect(a.id)}>
                  <div className="font-mono text-xs">{a.id}</div>
                  {a.alt && <div className="text-sm">{a.alt}</div>}
                  <div className="flex items-center gap-2">
                    {a.caption && <div className="text-xs text-gray-500">{a.caption}</div>}
                    {a.used && (
                      <span className="ml-auto inline-block rounded bg-gray-100 text-gray-700 px-2 py-0.5 text-[10px] uppercase tracking-wide" title="This photo is already used in a collection" data-testid="asset-used-badge">USED</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-medium mb-2">Assets in collection</h2>
          <div data-testid="collection-assets" className="grid grid-cols-1 gap-2">
            {collectionAssets.map((a) => (
              <div key={a.id} data-testid="collection-asset" className="border rounded p-3 flex items-center justify-between" draggable onDragStart={() => setDraggingId(a.id)} onDragOver={(e) => { e.preventDefault(); }} onDrop={() => void onDropReorder(a.id)}>
                <div>
                  <div className="font-mono text-xs">{a.id}</div>
                  {a.alt && <div className="text-sm">{a.alt}</div>}
                </div>
                <button type="button" className="px-2 py-1 border rounded" data-testid="remove-collection-asset-btn" onClick={() => void removeFromCollection(a.id)}>Remove</button>
              </div>
            ))}
            {!loading && collectionAssets.length === 0 && (
              <div className="text-gray-500">No assets in this collection yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
