"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import AccessibleDialog from '@/components/ui/AccessibleDialog';
import Breadcrumb from '@/components/admin/Breadcrumb';

interface Year { id: string; label: string; }
interface Collection { id: string; title: string; slug: string; status: 'draft' | 'published'; year_id: string; order_index?: string; updated_at?: string; }

export default function AdminCollectionsPage() {
  const [years, setYears] = useState<Year[]>([]);
  const [yearsLoading, setYearsLoading] = useState<boolean>(true);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ slug: string; title: string; summary?: string; status: 'draft' | 'published'; updated_at?: string }>({ slug: '', title: '', status: 'draft' });
  const [editing, setEditing] = useState<Collection | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // A11y live announcer for reorder and destructive actions
  const [liveText, setLiveText] = useState('');

  async function safeJson<T = any>(res: Response, fallback: T): Promise<T> {
    try {
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.includes('application/json')) return fallback;
      const text = await res.text();
      if (!text) return fallback;
      return JSON.parse(text) as T;
    } catch {
      return fallback;
    }
  }

  // Dev/E2E robustness: retry fetch briefly to avoid transient empty/HTML responses
  async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit, retries = 2, backoffMs = 200): Promise<Response> {
    let lastErr: unknown = null;
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await fetch(input, init);
        if (res.ok) return res;
        lastErr = new Error(`HTTP ${res.status}`);
      } catch (e) {
        lastErr = e;
      }
      if (i < retries) await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
    }
    throw lastErr instanceof Error ? lastErr : new Error('Fetch failed');
  }

  // Avoid SSR/client hydration mismatch by only rendering interactive UI after mount
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => { (async () => {
    try {
  const res = await fetchWithRetry('/api/years?status=all&order=asc', { cache: 'no-store' });
      const ys = await safeJson<Year[]>(res, []);
      if (!res.ok) throw new Error('Failed to load years');
      const list = Array.isArray(ys) ? ys : [];
      setYears(list);
      if (!selectedYear && list.length) setSelectedYear(list[0].id);
    } catch (e: unknown) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to load years' });
      setYears([]);
    } finally {
      setYearsLoading(false);
    }
  })(); }, []);

  useEffect(() => { (async () => {
    if (!selectedYear) return;
    try {
  const res = await fetchWithRetry(`/api/years/${selectedYear}/collections?status=all`, { cache: 'no-store' });
  const data = await safeJson<Collection[]>(res, []);
  if (!res.ok) throw new Error('Failed to load collections');
  setCollections(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to load collections' });
      setCollections([]);
    }
  })(); }, [selectedYear]);

  async function saveCollection() {
    setMessage(null);
    if (!selectedYear) {
      setMessage({ type: 'error', text: 'Please create/select a year first.' });
      return;
    }
    if (!form.slug || !form.title) return;
    try {
      if (editing) {
        const res = await fetch(`/api/collections/${editing.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
        if (!res.ok) throw new Error('Update failed');
      } else {
        // Prevent duplicate slug within the selected year to keep UI deterministic in tests
        const existing = collections.find(c => c.slug === form.slug);
        if (existing) {
          const res = await fetch(`/api/collections/${existing.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
          if (!res.ok) throw new Error('Update failed');
        } else {
          const res = await fetch(`/api/years/${selectedYear}/collections`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
          if (!res.ok) throw new Error('Create failed');
        }
      }
      setMessage({ type: 'success', text: 'Saved' });
      setShowForm(false);
      setEditing(null);
      const r2 = await fetch(`/api/years/${selectedYear}/collections?status=all`, { cache: 'no-store' });
      const json2 = await safeJson<Collection[]>(r2, []);
      setCollections(json2);
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : 'Save failed';
      setMessage({ type: 'error', text });
    }
  }

  async function deleteCollection(id: string) {
    setMessage(null);
    const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
    if (res.status === 204) {
      setMessage({ type: 'success', text: 'Deleted' });
      // refresh list
      if (selectedYear) {
        const r2 = await fetch(`/api/years/${selectedYear}/collections?status=all`, { cache: 'no-store' });
        const json2 = await safeJson<Collection[]>(r2, []);
        setCollections(json2);
      }
    } else {
      try {
        const body = await safeJson(res, {} as any);
        setMessage({ type: 'error', text: body?.message || 'Delete failed' });
      } catch {
        setMessage({ type: 'error', text: 'Delete failed' });
      }
    }
  }

  function startCreate() {
    setEditing(null);
    setForm({ slug: '', title: '', status: 'draft' });
    if (!selectedYear) {
      setMessage({ type: 'error', text: 'Please create/select a year first.' });
      setShowForm(false);
    } else {
      setShowForm(true);
    }
  }

  function startEdit(c: Collection) {
    setEditing(c);
    // Format date for input (YYYY-MM-DD)
    const dateStr = c.updated_at ? new Date(c.updated_at).toISOString().split('T')[0] : '';
    setForm({ slug: c.slug, title: c.title, status: c.status, updated_at: dateStr });
    setShowForm(true);
    // 讓表單聚焦並捲動到可視區，避免使用者誤以為沒反應
    requestAnimationFrame(() => {
      const el = formRef.current;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const input = el.querySelector('#collection-title-input') as HTMLInputElement | null;
        input?.focus();
      }
    });
  }

  // Reorder collections within selected year by recomputing a stable sequence
  async function moveCollection(index: number, delta: -1 | 1) {
    setMessage(null);
    const targetIndex = index + delta;
    if (index < 0 || targetIndex < 0 || index >= collections.length || targetIndex >= collections.length) return;
    // Create a new array reflecting the swap
    const next = [...collections];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    // Compute stable padded order_index to preserve lexicographic ordering
    const updates = next.map((c, i) => ({ id: c.id, order_index: String(i + 1).padStart(6, '0') }));
    try {
      // Apply all updates
      const results = await Promise.all(
        updates.map(u => fetch(`/api/collections/${u.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ order_index: u.order_index }) }))
      );
      const allOk = results.every(r => r.ok);
      if (!allOk) throw new Error('Some updates failed');
      setMessage({ type: 'success', text: 'Collection order updated' });
      // Announce via live region for screen readers
      setLiveText(`Reordered collection: ${moved.title} to position ${targetIndex + 1}`);
      const r3 = await fetch(`/api/years/${selectedYear}/collections?status=all`, { cache: 'no-store' });
      const refreshed = await safeJson<Collection[]>(r3, []);
      setCollections(refreshed);
    } catch {
      setMessage({ type: 'error', text: 'Reorder failed' });
      setLiveText('Reorder failed');
    }
  }

  function onItemKeyDown(e: KeyboardEvent<HTMLLIElement>, idx: number) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      void moveCollection(idx, -1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      void moveCollection(idx, 1);
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <Breadcrumb items={[{ label: 'Collections' }]} />
        <h1 className="text-2xl font-semibold mb-4">Collections</h1>
        {/* ARIA live region for announcements (screen-reader only) */}
        <div role="status" aria-live="polite" aria-atomic="true" data-testid="collections-announce" className="sr-only">{liveText}</div>
        {!mounted ? (
          <div className="flex items-center gap-3 mb-4">
            <div className="text-sm text-gray-500">Loading…</div>
          </div>
        ) : (
        <div className="flex items-center gap-3 mb-4">
          {yearsLoading ? (
            <div className="text-sm text-gray-500">Loading years…</div>
          ) : (
            <>
              <label htmlFor="year-filter-select" className="text-sm">Filter by year</label>
              <select
                id="year-filter-select"
                data-testid="year-filter-select"
                value={selectedYear}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedYear(e.target.value)}
                className="border rounded px-2 py-1"
                disabled={years.length === 0}
                aria-disabled={years.length === 0}
              >
                {years.length === 0 ? (
                  <option value="">No years available</option>
                ) : (
                  years.map(y => (<option key={y.id} value={y.id}>{y.label}</option>))
                )}
              </select>
              <button
                data-testid="create-collection-btn"
                onClick={startCreate}
                className="px-3 py-2 border rounded"
                disabled={!selectedYear}
                aria-disabled={!selectedYear}
                title={!selectedYear ? 'Please create/select a year first' : 'Create Collection'}
              >
                Create Collection
              </button>
            </>
          )}
          {message && (
            <div data-testid={message.type === 'success' ? 'success-message' : 'error-message'} className={message.type === 'success' ? 'text-green-600' : 'text-red-600'}>
              {message.text}
            </div>
          )}
        </div>
        )}

        {mounted && years.length === 0 && (
          <div className="mb-4 p-3 border rounded bg-yellow-50 text-yellow-900" data-testid="no-years-message">
            尚未建立任何年份，請先到 Years 頁面新增年份後再建立 Collections。
          </div>
        )}

        {mounted && showForm && (
          <div ref={formRef} data-testid="collection-form" className="border rounded p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1" htmlFor="collection-slug-input">Slug</label>
                <input
                  id="collection-slug-input"
                  data-testid="collection-slug-input"
                  value={form.slug}
                  onChange={e => setForm({ ...form, slug: e.target.value })}
                  className="border rounded px-2 py-1 w-full"
                  aria-invalid={!form.slug}
                  aria-describedby={!form.slug ? 'collection-slug-error' : undefined}
                />
                {!form.slug && (
                  <div id="collection-slug-error" className="text-xs text-red-600 mt-1" data-testid="field-error">Slug is required</div>
                )}
              </div>
              <div>
                <label className="block text-sm mb-1" htmlFor="collection-title-input">Title</label>
                <input
                  id="collection-title-input"
                  data-testid="collection-title-input"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="border rounded px-2 py-1 w-full"
                  aria-invalid={!form.title}
                  aria-describedby={!form.title ? 'collection-title-error' : undefined}
                />
                {!form.title && (
                  <div id="collection-title-error" className="text-xs text-red-600 mt-1" data-testid="field-error">Title is required</div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1" htmlFor="collection-summary-textarea">Summary</label>
                <textarea id="collection-summary-textarea" data-testid="collection-summary-textarea" value={form.summary || ''} onChange={e => setForm({ ...form, summary: e.target.value })} className="border rounded px-2 py-1 w-full" />
              </div>
              <div>
                <label className="block text-sm mb-1" htmlFor="collection-status-select">Status</label>
                <select id="collection-status-select" data-testid="collection-status-select" value={form.status} onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm({ ...form, status: e.target.value as 'draft' | 'published' })} className="border rounded px-2 py-1 w-full">
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1" htmlFor="collection-updated-at-input">更新日期（選填）</label>
                <input
                  type="date"
                  id="collection-updated-at-input"
                  data-testid="collection-updated-at-input"
                  value={form.updated_at || ''}
                  onChange={e => setForm({ ...form, updated_at: e.target.value })}
                  className="border rounded px-2 py-1 w-full"
                />
                <div className="text-xs text-gray-500 mt-1">留空則使用系統自動時間</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button data-testid="save-collection-btn" onClick={saveCollection} className="px-3 py-2 border rounded">Save</button>
              <button onClick={() => setShowForm(false)} className="px-3 py-2 border rounded">Cancel</button>
            </div>
          </div>
        )}

        <ul>
          {mounted && collections.map((c, idx) => (
            <li key={c.id} data-testid="collection-item" className="flex items-center justify-between border-b py-2" tabIndex={0} onKeyDown={(e) => onItemKeyDown(e, idx)}>
              <div className="flex items-center gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    {c.title} <span className="text-xs text-gray-500">({c.status})</span>
                  </div>
                  {c.updated_at && (
                    <div className="text-xs text-gray-400 mt-1">
                      更新於 {new Date(c.updated_at).toLocaleDateString('zh-TW', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit'
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-1" aria-label="reorder controls">
                  <button type="button" data-testid="move-collection-up" className="px-2 py-1 border rounded" onClick={() => moveCollection(idx, -1)} disabled={idx === 0} aria-disabled={idx === 0} title="Move up">↑</button>
                  <button type="button" data-testid="move-collection-down" className="px-2 py-1 border rounded" onClick={() => moveCollection(idx, 1)} disabled={idx === collections.length - 1} aria-disabled={idx === collections.length - 1} title="Move down">↓</button>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" data-testid="edit-collection-btn" className="px-2 py-1 border rounded" onClick={() => startEdit(c)}>Edit</button>
                <Link href={`/admin/collections/${c.id}`} data-testid="manage-photos-btn" className="px-2 py-1 border rounded">Manage Photos</Link>
                <button type="button" data-testid="delete-collection-btn" className="px-2 py-1 border rounded" onClick={() => { setConfirmId(c.id); setIsDialogOpen(true); }}>Delete</button>
              </div>
            </li>
          ))}
        </ul>

        {confirmId && (
          <AccessibleDialog open={isDialogOpen} titleId="confirm-title" onClose={() => { setIsDialogOpen(false); setConfirmId(null); }} dataTestId="confirm-dialog">
            <p id="confirm-title" className="mb-3">Are you sure?</p>
            <div className="flex gap-2 justify-end">
              <button data-autofocus data-testid="confirm-delete-btn" onClick={() => { if (confirmId) { deleteCollection(confirmId); } setConfirmId(null); setIsDialogOpen(false); }} className="px-3 py-2 border rounded">Confirm</button>
              <button onClick={() => { setConfirmId(null); setIsDialogOpen(false); }} className="px-3 py-2 border rounded">Cancel</button>
            </div>
          </AccessibleDialog>
        )}
      </div>
    </div>
  );
}
