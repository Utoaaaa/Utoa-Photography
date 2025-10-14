'use client';

import { useEffect, useMemo, useState } from 'react';

export interface AdminLocation {
  id: string;
  yearId: string;
  name: string;
  slug: string;
  summary: string | null;
  coverAssetId: string | null;
  orderIndex: string;
  createdAt: string;
  updatedAt: string;
  collectionCount: number;
}

interface LocationFormProps {
  mode: 'create' | 'edit';
  yearId: string;
  yearLabel: string;
  location?: AdminLocation | null;
  onSaved: (location: AdminLocation) => void;
  onCancel: () => void;
}

interface FormError {
  field?: 'name' | 'slug';
  message: string;
}

const slugPattern = /^[a-z0-9-]+-[0-9]{2}$/;

function slugify(name: string, yearLabel: string) {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  const suffix = yearLabel.slice(-2) || 'yy';
  return base ? `${base}-${suffix}` : `location-${suffix}`;
}

async function submitRequest(yearId: string, mode: 'create' | 'edit', payload: Record<string, unknown>) {
  const res = await fetch(`/api/admin/years/${encodeURIComponent(yearId)}/locations`, {
    method: mode === 'edit' ? 'PUT' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = mode === 'edit' ? '更新地點失敗' : '建立地點失敗';
    try {
      const json = (await res.json()) as { message?: string; error?: string };
      if (json?.message) message = json.message;
      else if (json?.error) message = json.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as AdminLocation;
}

export default function LocationForm({ mode, yearId, yearLabel, location, onSaved, onCancel }: LocationFormProps) {
  const [name, setName] = useState(location?.name ?? '');
  const [slug, setSlug] = useState(location?.slug ?? '');
  const [summary, setSummary] = useState(location?.summary ?? '');
  const [coverAssetId, setCoverAssetId] = useState(location?.coverAssetId ?? '');
  const [formError, setFormError] = useState<FormError | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(location?.name ?? '');
    setSlug(location?.slug ?? '');
    setSummary(location?.summary ?? '');
    setCoverAssetId(location?.coverAssetId ?? '');
    setFormError(null);
    setStatusMessage('');
  }, [location, mode]);

  const suggestedSlug = useMemo(() => slugify(name || location?.name || '', yearLabel), [name, location?.name, yearLabel]);

  function validate() {
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim().toLowerCase();
    if (!trimmedName) {
      setFormError({ field: 'name', message: '請輸入地點名稱。' });
      return null;
    }
    if (!trimmedSlug) {
      setFormError({ field: 'slug', message: '請輸入 slug。' });
      return null;
    }
    if (!slugPattern.test(trimmedSlug)) {
      setFormError({ field: 'slug', message: 'Slug 需為小寫英數與短橫線，並以年份後兩碼結尾，例如 kyoto-24。' });
      return null;
    }
    return {
      name: trimmedName,
      slug: trimmedSlug,
      summary: summary.trim() ? summary.trim() : null,
      coverAssetId: coverAssetId.trim() ? coverAssetId.trim() : null,
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const data = validate();
    if (!data) return;

    setIsSubmitting(true);
    setStatusMessage('');
    try {
      const payload = mode === 'edit' ? { id: location?.id, ...data } : data;
      const saved = await submitRequest(yearId, mode, payload);
      setStatusMessage(mode === 'edit' ? '地點已更新。' : '地點已建立。');
      onSaved(saved);
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失敗';
      setFormError({ message });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleUseSuggestedSlug() {
    setSlug(suggestedSlug);
    setFormError((prev) => (prev?.field === 'slug' ? null : prev));
  }

  return (
    <form data-testid="location-form" onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{mode === 'edit' ? '編輯地點' : '新增地點'}</h3>
          <p className="text-sm text-gray-500">年份：{yearLabel}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
        >
          關閉
        </button>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="location-name-input">
          地點名稱
        </label>
        <input
          id="location-name-input"
          data-testid="location-name-input"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (formError?.field === 'name') setFormError(null);
          }}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
          aria-invalid={formError?.field === 'name'}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700" htmlFor="location-slug-input">
            Slug
          </label>
          <button
            type="button"
            data-testid="generate-slug-btn"
            onClick={handleUseSuggestedSlug}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            使用建議值
          </button>
        </div>
        <input
          id="location-slug-input"
          data-testid="location-slug-input"
          value={slug}
          onChange={(event) => {
            setSlug(event.target.value);
            if (formError?.field === 'slug') setFormError(null);
          }}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
          aria-invalid={formError?.field === 'slug'}
          placeholder={suggestedSlug}
        />
        <p className="text-xs text-gray-500">格式：小寫英數與短橫線，並以年份後兩碼結尾，例如 `kyoto-24`。</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="location-summary-textarea">
          摘要（選填）
        </label>
        <textarea
          id="location-summary-textarea"
          data-testid="location-summary-textarea"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="location-cover-input">
          封面資產 ID（選填）
        </label>
        <input
          id="location-cover-input"
          data-testid="location-cover-input"
          value={coverAssetId}
          onChange={(event) => setCoverAssetId(event.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
          placeholder="例如：cloudflare-image-id"
        />
      </div>

      {formError && (
        <div data-testid="location-form-error" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError.message}
        </div>
      )}
      {statusMessage && (
        <div data-testid="location-form-message" className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {statusMessage}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          取消
        </button>
        <button
          type="submit"
          data-testid="save-location-btn"
          className="rounded-md border border-gray-900 bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-500"
          disabled={isSubmitting}
        >
          {isSubmitting ? '儲存中…' : mode === 'edit' ? '更新地點' : '建立地點'}
        </button>
      </div>
    </form>
  );
}
