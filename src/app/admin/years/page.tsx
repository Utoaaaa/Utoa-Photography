"use client";

import { useEffect, useState } from 'react';

interface Year {
  id: string;
  label: string;
  status: 'draft' | 'published';
  order_index: string;
}

export default function AdminYearsPage() {
  const [years, setYears] = useState<Year[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Year | null>(null);
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function loadYears() {
    const res = await fetch('/api/years?status=all&order=desc', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setYears(data);
    }
  }

  useEffect(() => { loadYears(); }, []);

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
        const res = await fetch('/api/years', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer test' }, body: JSON.stringify({ label, status }) });
        if (!res.ok) throw new Error('Failed to create');
      }
      setMessage({ type: 'success', text: 'Saved successfully' });
      setShowForm(false);
      await loadYears();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error' });
    }
  }

  async function deleteYear(id: string) {
    const res = await fetch(`/api/years/${id}?force=true`, { method: 'DELETE' });
    if (res.status === 204) {
      setMessage({ type: 'success', text: 'Deleted' });
      await loadYears();
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Years</h1>

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
              <label className="block text-sm mb-1">Label</label>
              <input data-testid="year-label-input" value={label} onChange={e => setLabel(e.target.value)} className="border rounded px-2 py-1 w-full" />
              {!label && <div data-testid="field-error" className="text-xs text-red-600 mt-1">Label is required</div>}
            </div>
            <div className="mb-2">
              <label className="block text-sm mb-1">Status</label>
              <select data-testid="year-status-select" value={status} onChange={e => setStatus(e.target.value as any)} className="border rounded px-2 py-1">
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
          {years.map(y => (
            <li key={y.id} data-testid="year-item" className="flex items-center justify-between border-b py-2">
              <div>{y.label} <span className="text-xs text-gray-500">({y.status})</span></div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(y)} data-testid="edit-year-btn" className="px-2 py-1 border rounded">Edit</button>
                <button onClick={() => setConfirmId(y.id)} data-testid="delete-year-btn" className="px-2 py-1 border rounded">Delete</button>
              </div>
            </li>
          ))}
        </ul>

        {confirmId && (
          <div data-testid="confirm-dialog" className="fixed inset-0 bg-black/30 flex items-center justify-center">
            <div className="bg-white p-4 rounded shadow">
              <p className="mb-3">Are you sure?</p>
              <div className="flex gap-2 justify-end">
                <button data-testid="confirm-delete-btn" onClick={() => { deleteYear(confirmId); setConfirmId(null); }} className="px-3 py-2 border rounded">Confirm</button>
                <button onClick={() => setConfirmId(null)} className="px-3 py-2 border rounded">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
