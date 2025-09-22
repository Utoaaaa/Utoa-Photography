"use client";

import { useEffect, useState } from 'react';

interface Year { id: string; label: string; }
interface Collection { id: string; title: string; slug: string; status: 'draft' | 'published'; year_id: string; }

export default function AdminCollectionsPage() {
  const [years, setYears] = useState<Year[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ slug: string; title: string; summary?: string; status: 'draft' | 'published' }>({ slug: '', title: '', status: 'draft' });
  const [message, setMessage] = useState<string>('');

  useEffect(() => { (async () => {
    const res = await fetch('/api/years?status=all&order=desc', { cache: 'no-store' });
    const ys = await res.json();
    setYears(ys);
    if (ys.length) setSelectedYear(ys[0].id);
  })(); }, []);

  useEffect(() => { (async () => {
    if (!selectedYear) return;
    const res = await fetch(`/api/years/${selectedYear}/collections?status=all`, { cache: 'no-store' });
    if (res.ok) setCollections(await res.json());
  })(); }, [selectedYear]);

  async function saveCollection() {
    setMessage('');
    if (!selectedYear) return;
    if (!form.slug || !form.title) return;
    const res = await fetch(`/api/years/${selectedYear}/collections`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) {
      setMessage('Saved');
      setShowForm(false);
      const r2 = await fetch(`/api/years/${selectedYear}/collections?status=all`, { cache: 'no-store' });
      setCollections(await r2.json());
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Collections</h1>
        <div className="flex items-center gap-3 mb-4">
          <select data-testid="year-filter-select" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="border rounded px-2 py-1">
            {years.map(y => (<option key={y.id} value={y.id}>{y.label}</option>))}
          </select>
          <button data-testid="create-collection-btn" onClick={() => setShowForm(true)} className="px-3 py-2 border rounded">Create Collection</button>
          {message && <div data-testid="success-message" className="text-green-600">{message}</div>}
        </div>

        {showForm && (
          <div data-testid="collection-form" className="border rounded p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Slug</label>
                <input data-testid="collection-slug-input" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="border rounded px-2 py-1 w-full" />
              </div>
              <div>
                <label className="block text-sm mb-1">Title</label>
                <input data-testid="collection-title-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="border rounded px-2 py-1 w-full" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Summary</label>
                <textarea data-testid="collection-summary-textarea" value={form.summary || ''} onChange={e => setForm({ ...form, summary: e.target.value })} className="border rounded px-2 py-1 w-full" />
              </div>
              <div>
                <label className="block text-sm mb-1">Status</label>
                <select data-testid="collection-status-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} className="border rounded px-2 py-1 w-full">
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button data-testid="save-collection-btn" onClick={saveCollection} className="px-3 py-2 border rounded">Save</button>
              <button onClick={() => setShowForm(false)} className="px-3 py-2 border rounded">Cancel</button>
            </div>
          </div>
        )}

        <ul>
          {collections.map(c => (
            <li key={c.id} data-testid="collection-item" className="flex items-center justify-between border-b py-2">
              <div>{c.title} <span className="text-xs text-gray-500">({c.status})</span></div>
              <div className="flex gap-2">
                <button data-testid="edit-collection-btn" className="px-2 py-1 border rounded" onClick={() => { /* No-op for now */ }}>Edit</button>
                <button data-testid="manage-photos-btn" className="px-2 py-1 border rounded" onClick={() => { /* placeholder */ }}>Manage Photos</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
