"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Breadcrumb from '@/components/admin/Breadcrumb';

interface Asset { id: string; alt?: string | null; caption?: string | null; used?: boolean }

export default function ManagePhotosClient({ id }: { id: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collectionAssets, setCollectionAssets] = useState<Array<{ id: string; alt?: string | null; caption?: string | null; order_index: string }>>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  async function safeJson<T = any>(res: Response, fallback: T): Promise<T> {
    try {
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.includes('application/json')) return fallback;
      const text = await res.text();
      if (!text) return fallback;
      return JSON.parse(text) as T;
    } catch { return fallback; }
  }

  async function fetchJsonWithRetry<T = any>(url: string, init?: RequestInit, fallback: T = {} as T, retries = 2, delayMs = 150): Promise<{ ok: boolean; data: T; status: number; }>
  {
    let lastStatus = 0;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, init);
        lastStatus = res.status;
        const data = await safeJson<T>(res, fallback);
        if (res.ok && (data as any) !== fallback) return { ok: true, data, status: res.status };
        if (attempt < retries) await new Promise(r => setTimeout(r, delayMs));
      } catch {
        if (attempt < retries) await new Promise(r => setTimeout(r, delayMs));
      }
    }
    return { ok: false, data: fallback, status: lastStatus };
  }

  useEffect(() => { (async () => {
    if (!id) { setLoading(false); return; }
    try {
      const { ok: ok1, data } = await fetchJsonWithRetry<Asset[]>(
        '/api/assets',
        { cache: 'no-store' },
        [] as Asset[]
      );
      if (!ok1) throw new Error('Failed to load assets');
      setAssets(Array.isArray(data) ? data : []);

      const { ok: ok2, data: col } = await fetchJsonWithRetry<any>(
        `/api/collections/${id}?include_assets=true`,
        { cache: 'no-store' },
        {} as any
      );
      if (!ok2) throw new Error('Failed to load collection');
      const list = Array.isArray(col?.assets) ? col.assets : [];
      setCollectionAssets(list.map((a: any) => ({ id: a.id, alt: a.alt, caption: a.caption, order_index: a.order_index })));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load assets');
    } finally { setLoading(false); }
  })(); }, [id]);

  function toggleSelect(assetId: string) {
    setSelected(prev => { const next = new Set(prev); next.has(assetId) ? next.delete(assetId) : next.add(assetId); return next; });
  }

  async function reloadCollectionAssets() {
    if (!id) return;
    try {
      const { ok, data: col } = await fetchJsonWithRetry<any>(
        `/api/collections/${id}?include_assets=true`,
        { cache: 'no-store' },
        {} as any
      );
      if (!ok) return;
      const list = Array.isArray(col?.assets) ? col.assets : [];
      setCollectionAssets(list.map((a: any) => ({ id: a.id, alt: a.alt, caption: a.caption, order_index: a.order_index })));
    } catch { /* ignore */ }
  }

  async function addToCollection() {
    setMessage(null);
    const asset_ids = Array.from(selected);
    if (asset_ids.length === 0) return;
    try {
      const res = await fetch(`/api/collections/${id}/assets`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ asset_ids }) });
      if (!res.ok) {
        const body = await safeJson(res, {} as any);
        throw new Error(body?.message || 'Failed to add assets');
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
        const body = await safeJson(res, {} as any);
        throw new Error(body?.message || 'Failed to remove asset');
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
    if (!res.ok) { const body = await safeJson(res, {} as any); throw new Error(body?.message || 'Failed to reorder'); }
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
