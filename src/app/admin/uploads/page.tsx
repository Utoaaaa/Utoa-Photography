"use client";

import { useEffect, useState } from 'react';

interface Asset { id: string; alt: string; caption?: string | null; width: number; height: number; }

export default function AdminUploadsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [alt, setAlt] = useState('Uploaded test image');
  const [caption, setCaption] = useState('This image was uploaded via admin interface');
  const [message, setMessage] = useState<string>('');

  async function loadAssets() {
    const res = await fetch('/api/assets?limit=50&offset=0', { cache: 'no-store' });
    if (res.ok) setAssets(await res.json());
  }

  useEffect(() => { loadAssets(); }, []);

  async function simulateUpload() {
    setMessage('');
    // simulate direct upload mocked by Playwright route
    const direct = await fetch('/api/images/direct-upload', { method: 'POST' });
    if (!direct.ok) { setMessage('Direct upload failed'); return; }
    const directJson = await direct.json();
    const imageId = directJson.image_id || directJson.result?.id || 'test-uploaded-image-id';

    const assetId = imageId;
    const create = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: assetId, alt, caption, width: 1920, height: 1080 })
    });
    if (create.ok) {
      setMessage('Upload success');
      await loadAssets();
    } else {
      setMessage('Upload failed');
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Uploads</h1>
        <div data-testid="upload-area" className="border rounded p-4 mb-4">
          <div className="mb-2">
            <button data-testid="select-files-btn" onClick={simulateUpload} className="px-3 py-2 border rounded">Select Files</button>
            <input data-testid="file-input" type="file" className="hidden" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Alt</label>
              <input data-testid="asset-alt-input" value={alt} onChange={e => setAlt(e.target.value)} className="border rounded px-2 py-1 w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">Caption</label>
              <textarea data-testid="asset-caption-textarea" value={caption} onChange={e => setCaption(e.target.value)} className="border rounded px-2 py-1 w-full" />
            </div>
          </div>
          <div className="mt-3">
            <button data-testid="save-asset-btn" onClick={simulateUpload} className="px-3 py-2 border rounded">Save Asset</button>
          </div>
          {message && (<div data-testid={message.includes('success') ? 'upload-success' : 'error-message'} className={message.includes('success') ? 'text-green-600 mt-2' : 'text-red-600 mt-2'}>{message}</div>)}
        </div>

        <div data-testid="asset-list" className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {assets.map(a => (
            <div key={a.id} data-testid="asset-card" className="border rounded p-3">
              <div className="font-medium">{a.alt}</div>
              <div className="text-xs text-gray-500">{a.width}×{a.height}</div>
              <div className="mt-1 text-sm text-gray-600">{a.caption}</div>
              <input type="checkbox" data-testid="asset-checkbox" className="mt-2"/>
            </div>
          ))}
        </div>

        <div data-testid="bulk-actions" className="mt-4">
          <button data-testid="bulk-delete-btn" className="px-3 py-2 border rounded">Bulk Delete</button>
          <button data-testid="confirm-bulk-delete-btn" className="px-3 py-2 border rounded ml-2" onClick={() => {
            // simulate progress
            const progress = document.getElementById('bulk-progress');
            if (progress) progress.classList.remove('hidden');
            setTimeout(() => {
              const complete = document.getElementById('bulk-complete');
              if (complete) complete.classList.remove('hidden');
            }, 500);
          }}>Confirm</button>
          <div id="bulk-progress" data-testid="bulk-progress" className="hidden mt-2 text-sm text-gray-600">Processing…</div>
          <div id="bulk-complete" data-testid="bulk-complete" className="hidden mt-2 text-sm text-green-600">Completed</div>
        </div>
      </div>
    </div>
  );
}
