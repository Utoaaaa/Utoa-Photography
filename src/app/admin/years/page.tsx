"use client";

import AccessibleDialog from '@/components/ui/AccessibleDialog';
import Breadcrumb from '@/components/admin/Breadcrumb';
import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';

interface Year {
  id: string;
  label: string;
  status: 'draft' | 'published';
  order_index: string;
  hasCollections?: boolean; // client-side augmentation
}

const isYearArray = (value: unknown): value is Year[] =>
  Array.isArray(value) &&
  value.every((item) =>
    item &&
    typeof item === 'object' &&
    typeof (item as Partial<Year>).id === 'string' &&
    typeof (item as Partial<Year>).label === 'string' &&
    ((item as Partial<Year>).status === 'draft' || (item as Partial<Year>).status === 'published') &&
    typeof (item as Partial<Year>).order_index === 'string',
  );

const isUnknownArray = (value: unknown): value is unknown[] => Array.isArray(value);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const getStringProp = (obj: Record<string, unknown>, key: string): string | undefined => {
  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
};

async function safeJson<T>(res: Response, fallback: T, validate?: (value: unknown) => value is T): Promise<T> {
  try {
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('application/json')) return fallback;
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

export default function AdminYearsPage() {
  const [years, setYears] = useState<Year[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Year | null>(null);
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmForce, setConfirmForce] = useState(false);
  // A11y live announcer for reorder and destructive actions
  const [liveText, setLiveText] = useState('');

  const loadYears = useCallback(async () => {
    try {
      // Use asc to align with recomputed padded order_index sequencing
      const res = await fetchWithRetry('/api/years?status=all&order=asc', { cache: 'no-store' });
      const data = await safeJson<Year[]>(res, [], isYearArray);
      // Fetch collections count per year to determine delete guard
      const augmented = await Promise.all(
        data.map(async (y) => {
          try {
            const cRes = await fetchWithRetry(`/api/years/${y.id}/collections?status=all`, { cache: 'no-store' });
            const cols = await safeJson<unknown[]>(cRes, [], isUnknownArray);
            return { ...y, hasCollections: cols.length > 0 };
          } catch {
            return { ...y, hasCollections: false };
          }
        })
      );
      setYears(augmented);
    } catch {
      // Swallow to avoid breaking UI flows; keep previous list or empty
      setYears([]);
    }
  }, []);

  useEffect(() => { void loadYears(); }, [loadYears]);

  const startCreate = () => { setEditing(null); setLabel(''); setStatus('draft'); setShowForm(true); };
  const startEdit = (y: Year) => { setEditing(y); setLabel(y.label); setStatus(y.status); setShowForm(true); };

  async function saveYear() {
    setMessage(null);
    try {
      if (!label) {
        setMessage({ type: 'error', text: 'Label is required' });
        return;
      }
      if (editing) {
  const res = await fetch(`/api/years/${editing.id}` , { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label, status }) });
        if (!res.ok) throw new Error('Failed to update');
      } else {
        // De-dupe by label to avoid multiple identical rows breaking tests/selectors
        const existing = years.find(y => y.label === label);
        if (existing) {
          const res = await fetch(`/api/years/${existing.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label, status }) });
          if (!res.ok) throw new Error('Failed to update');
        } else {
          const res = await fetch('/api/years', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label, status }) });
          if (!res.ok) throw new Error('Failed to create');
        }
      }
      setMessage({ type: 'success', text: 'Saved successfully' });
      setShowForm(false);
      await loadYears();
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : 'Error';
      setMessage({ type: 'error', text });
    }
  }

  async function deleteYear(id: string, force?: boolean) {
    setMessage(null);
    const url = force ? `/api/years/${id}?force=true` : `/api/years/${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.status === 204) {
      setMessage({ type: 'success', text: 'Deleted' });
      await loadYears();
      return;
    }
    if (res.status === 409) {
      // Year has collections, block deletion and inform user
      setMessage({ type: 'error', text: 'Cannot delete a year that has collections. Remove or move collections first.' });
      return;
    }
    try {
      const body = await safeJson<Record<string, unknown>>(res, {}, isRecord);
      const error = getStringProp(body, 'error');
      const detail = getStringProp(body, 'message');
      const text = (error || detail)
        ? `${error || 'Error'}${detail ? `: ${detail}` : ''}`
        : 'Delete failed';
      setMessage({ type: 'error', text });
    } catch {
      setMessage({ type: 'error', text: 'Delete failed' });
    }
  }

  // Reorder helpers: recompute full padded sequence and persist (like Collections)
  async function moveYear(index: number, delta: -1 | 1) {
    setMessage(null);
    const targetIndex = index + delta;
    if (index < 0 || targetIndex < 0 || index >= years.length || targetIndex >= years.length) return;
    // Create next order state by moving item
    const next = [...years];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);

    // Compute stable padded order_index (ascending)
    const updates = next.map((y, i) => ({ id: y.id, order_index: String(i + 1).padStart(6, '0') }));

    try {
      const results = await Promise.allSettled(
        updates.map(u => fetch(`/api/years/${u.id}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ order_index: u.order_index })
        }))
      );
      const movedResult = results[updates.findIndex(u => u.id === moved.id)];
      const movedOk = movedResult && movedResult.status === 'fulfilled' && (movedResult as PromiseFulfilledResult<Response>).value.ok;
      if (!movedOk) throw new Error('Primary update failed');
      setMessage({ type: 'success', text: 'Reordered year order' });
      // Announce via live region for screen readers
      setLiveText(`Reordered year: ${moved.label} to position ${targetIndex + 1}`);
      await loadYears();
    } catch {
      setMessage({ type: 'error', text: 'Reorder failed' });
      setLiveText('Reorder failed');
    }
  }

  function onItemKeyDown(e: KeyboardEvent<HTMLLIElement>, idx: number) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      void moveYear(idx, -1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      void moveYear(idx, 1);
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <Breadcrumb items={[{ label: 'Years' }]} />
        <h1 className="text-2xl font-semibold mb-4">Years</h1>
        {/* ARIA live region for announcements (screen-reader only) */}
        <div role="status" aria-live="polite" aria-atomic="true" data-testid="years-announce" className="sr-only">{liveText}</div>

        <div className="mb-4 flex items-center gap-3">
          <button onClick={startCreate} data-testid="create-year-btn" className="px-3 py-2 border rounded">Create Year</button>
          {message && (
            <div data-testid={message.type === 'success' ? 'success-message' : 'error-message'} className={message.type === 'success' ? 'text-green-600' : 'text-red-600'}>
              {message.text}
            </div>
          )}
        </div>

        {showForm && (
          <div data-testid="year-form" className="border rounded p-4 mb-4">
            <div className="mb-2">
              <label className="block text-sm mb-1" htmlFor="year-label-input">Label</label>
              <input id="year-label-input" data-testid="year-label-input" value={label} onChange={e => setLabel(e.target.value)} className="border rounded px-2 py-1 w-full" aria-invalid={!label} aria-describedby={!label ? 'year-label-error' : undefined} />
              {!label && <div id="year-label-error" data-testid="field-error" className="text-xs text-red-600 mt-1">Label is required</div>}
            </div>
            <div className="mb-2">
              <label className="block text-sm mb-1">Status</label>
              <select
                data-testid="year-status-select"
                value={status}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as 'draft' | 'published')}
                className="border rounded px-2 py-1"
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={saveYear} data-testid="save-year-btn" className="px-3 py-2 border rounded">Save</button>
              <button onClick={() => setShowForm(false)} className="px-3 py-2 border rounded">Cancel</button>
            </div>
          </div>
        )}

        <ul>
          {years.map((y, idx) => (
            <li
              key={y.id}
              data-testid="year-item"
              className="flex items-center justify-between border-b py-2"
              tabIndex={0}
              onKeyDown={(e) => onItemKeyDown(e, idx)}
              aria-label={`${y.label} (${y.status})`}
            >
              <div className="flex items-center gap-2">
                <div>{y.label} <span className="text-xs text-gray-500">({y.status})</span></div>
                <div className="flex gap-1" aria-label="reorder controls">
                  <button
                    type="button"
                    data-testid="move-year-up"
                    className="px-2 py-1 border rounded"
                    onClick={() => moveYear(idx, -1)}
                    disabled={idx === 0}
                    aria-disabled={idx === 0}
                    title="Move up"
                  >↑</button>
                  <button
                    type="button"
                    data-testid="move-year-down"
                    className="px-2 py-1 border rounded"
                    onClick={() => moveYear(idx, 1)}
                    disabled={idx === years.length - 1}
                    aria-disabled={idx === years.length - 1}
                    title="Move down"
                  >↓</button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(y)} data-testid="edit-year-btn" className="px-2 py-1 border rounded">Edit</button>
                <button
                  onClick={() => { setConfirmId(y.id); setIsDialogOpen(true); }}
                  data-testid="delete-year-btn"
                  className="px-2 py-1 border rounded"
                  disabled={!!y.hasCollections}
                  aria-disabled={!!y.hasCollections}
                  title={y.hasCollections ? 'Cannot delete year with collections' : 'Delete year'}
                >Delete</button>
                {y.hasCollections && (
                  <button
                    onClick={() => { setConfirmForce(true); setConfirmId(y.id); setIsDialogOpen(true); }}
                    data-testid="force-delete-year-btn"
                    className="px-2 py-1 border rounded text-red-700 border-red-300 hover:bg-red-50"
                    title="Force delete this year and all its collections (cannot be undone)"
                  >Force Delete…</button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {confirmId && (
          <AccessibleDialog
            open={isDialogOpen}
            titleId="confirm-title"
            onClose={() => { setIsDialogOpen(false); setConfirmId(null); setConfirmForce(false); }}
            dataTestId="confirm-dialog"
          >
            <div className="mb-3">
              <p id="confirm-title" className="mb-2">{confirmForce ? 'Force delete this year?' : 'Delete this year?'}</p>
              {confirmForce && (
                <p className="text-sm text-red-700">This will permanently delete the year and all its collections, and remove their photo links. This action cannot be undone.</p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              {confirmForce ? (
                <button
                  data-autofocus
                  data-testid="confirm-force-delete-btn"
                  onClick={() => { deleteYear(confirmId, true); setConfirmId(null); setConfirmForce(false); setIsDialogOpen(false); }}
                  className="px-3 py-2 border rounded text-white bg-red-600 hover:bg-red-700"
                >Force Delete</button>
              ) : (
                <button
                  data-autofocus
                  data-testid="confirm-delete-btn"
                  onClick={() => { deleteYear(confirmId); setConfirmId(null); setIsDialogOpen(false); }}
                  className="px-3 py-2 border rounded"
                >Confirm</button>
              )}
              <button onClick={() => { setConfirmId(null); setConfirmForce(false); setIsDialogOpen(false); }} className="px-3 py-2 border rounded">Cancel</button>
            </div>
          </AccessibleDialog>
        )}
      </div>
    </div>
  );
}
