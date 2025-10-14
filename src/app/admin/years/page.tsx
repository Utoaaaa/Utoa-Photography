"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import Link from 'next/link';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import AccessibleDialog from '@/components/ui/AccessibleDialog';

interface Year {
  id: string;
  label: string;
  status: 'draft' | 'published';
  order_index: string;
  hasCollections?: boolean;
}

type Message = {
  type: 'success' | 'error';
  text: string;
};

const STATUS_LABELS: Record<Year['status'], string> = {
  draft: '草稿',
  published: '已發布',
};

const ORDER_PAD_LENGTH = 6;

const padOrderIndex = (value: number) => String(value).padStart(ORDER_PAD_LENGTH, '0');

const isYearArray = (value: unknown): value is Year[] =>
  Array.isArray(value) &&
  value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Partial<Year>;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.label === 'string' &&
      (candidate.status === 'draft' || candidate.status === 'published') &&
      typeof candidate.order_index === 'string'
    );
  });

const translateApiMessage = (message: string): string => {
  switch (message) {
    case 'label is required':
    case 'missing required field':
      return '請輸入年份名稱。';
    case 'invalid status':
    case 'status must be draft or published':
      return '狀態值不正確，請重新選擇。';
    case 'Cannot delete year with collections':
      return '此年份仍有作品集，請先移除作品集或使用強制刪除。';
    case 'Year was modified by another user':
    case 'Conflict':
      return '資料已被其他人更新，請重新整理後再試。';
    default:
      return message;
  }
};

const parseApiError = async (response: Response): Promise<string | null> => {
  try {
    const payload = await response.clone().json();
    if (payload && typeof payload.message === 'string') {
      return translateApiMessage(payload.message);
    }
  } catch {
    // ignore JSON parsing errors
  }

  if (response.status === 409) {
    return '操作發生衝突，請重新整理後再試。';
  }
  if (response.status >= 500) {
    return '伺服器暫時無法處理，請稍後再試。';
  }
  return null;
};

async function fetchHasCollections(yearId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/years/${encodeURIComponent(yearId)}/collections?status=all`, { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

export default function YearsPage() {
  const [years, setYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState<Year['status']>('draft');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmForce, setConfirmForce] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadYears = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/years?status=all&order=asc', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('failed to fetch years');
      }
      const payload = await response.json();
      if (!isYearArray(payload)) {
        throw new Error('invalid payload');
      }
      const sorted = [...payload].sort(
        (a, b) => a.order_index.localeCompare(b.order_index) || a.label.localeCompare(b.label, 'zh-TW')
      );
      const withCollections = await Promise.all(
        sorted.map(async (year) => ({
          ...year,
          hasCollections: await fetchHasCollections(year.id),
        }))
      );
      setYears(withCollections);
      setLiveText('年份列表已更新。');
    } catch (error) {
      console.error('Failed to load years', error);
      const text = '無法載入年份列表，請稍後再試。';
      setMessage({ type: 'error', text });
      setLiveText(text);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadYears();
  }, [loadYears]);

  const resetFormState = useCallback(() => {
    setEditingId(null);
    setLabel('');
    setStatus('draft');
    setShowForm(false);
  }, []);

  const openCreateForm = useCallback(() => {
    setEditingId(null);
    setLabel('');
    setStatus('draft');
    setShowForm(true);
    setMessage(null);
    setLiveText('開啟新增年份表單。');
  }, []);

  const startEdit = useCallback((year: Year) => {
    setEditingId(year.id);
    setLabel(year.label);
    setStatus(year.status);
    setShowForm(true);
    setMessage(null);
    setLiveText(`正在編輯年份 ${year.label}。`);
  }, []);

  const handleCancel = useCallback(() => {
    resetFormState();
    setMessage(null);
    setLiveText('已關閉年份表單。');
  }, [resetFormState]);

  const saveYear = useCallback(async () => {
    if (isSaving) return;

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      const text = '請輸入年份名稱。';
      setMessage({ type: 'error', text });
      setLiveText(text);
      return;
    }

    setIsSaving(true);
    try {
      const payload = { label: trimmedLabel, status };
      let response: Response;
      if (editingId) {
        response = await fetch(`/api/years/${encodeURIComponent(editingId)}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const nextOrderIndex = padOrderIndex(years.length + 1);
        response = await fetch('/api/years', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...payload, order_index: nextOrderIndex }),
        });
      }

      if (!response.ok) {
        const apiMessage = await parseApiError(response);
        throw new Error(apiMessage ?? '儲存年份時發生錯誤，請稍後再試。');
      }

      const successText = editingId ? '年份已更新。' : '年份已建立。';
      setMessage({ type: 'success', text: successText });
      setLiveText(successText);
      resetFormState();
      await loadYears();
    } catch (error) {
      console.error('Failed to save year', error);
      const text =
        error instanceof Error && error.message ? error.message : '儲存年份時發生錯誤，請稍後再試。';
      setMessage({ type: 'error', text });
      setLiveText(text);
    } finally {
      setIsSaving(false);
    }
  }, [editingId, isSaving, label, loadYears, resetFormState, status, years.length]);

  const deleteYear = useCallback(
    async (yearId: string, force = false) => {
      try {
        const response = await fetch(
          `/api/years/${encodeURIComponent(yearId)}${force ? '?force=true' : ''}`,
          { method: 'DELETE' }
        );

        if (response.status === 409 && !force) {
          const text = '此年份仍有作品集，請改用強制刪除。';
          setMessage({ type: 'error', text });
          setLiveText(text);
          return;
        }

        if (!response.ok && response.status !== 204) {
          const apiMessage = await parseApiError(response);
          throw new Error(apiMessage ?? '刪除年份時發生錯誤，請稍後再試。');
        }

        const successText = force ? '年份與底下作品集已刪除。' : '年份已刪除。';
        setMessage({ type: 'success', text: successText });
        setLiveText(successText);
        await loadYears();
      } catch (error) {
        console.error('Failed to delete year', error);
        const text =
          error instanceof Error && error.message ? error.message : '刪除年份時發生錯誤，請稍後再試。';
        setMessage({ type: 'error', text });
        setLiveText(text);
      }
    },
    [loadYears]
  );

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setConfirmId(null);
    setConfirmForce(false);
  }, []);

  const moveYear = useCallback(
    async (index: number, delta: -1 | 1) => {
      if (isReordering) return;

      const targetIndex = index + delta;
      if (index < 0 || targetIndex < 0 || index >= years.length || targetIndex >= years.length) {
        return;
      }

      setIsReordering(true);
      try {
        const next = [...years];
        const [moved] = next.splice(index, 1);
        next.splice(targetIndex, 0, moved);

        const updates = next.map((year, idx) => ({
          id: year.id,
          order_index: padOrderIndex(idx + 1),
        }));

        const responses = await Promise.all(
          updates.map((item) =>
            fetch(`/api/years/${encodeURIComponent(item.id)}`, {
              method: 'PUT',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ order_index: item.order_index }),
            })
          )
        );

        if (responses.some((res) => !res.ok)) {
          throw new Error('reorder failed');
        }

        const text = `已將 ${moved.label} 移至第 ${targetIndex + 1} 位。`;
        setMessage({ type: 'success', text: '年份排序已更新。' });
        setLiveText(text);
        await loadYears();
      } catch (error) {
        console.error('Failed to reorder years', error);
        const text = '更新排序時發生錯誤，請稍後再試。';
        setMessage({ type: 'error', text });
        setLiveText(text);
      } finally {
        setIsReordering(false);
      }
    },
    [isReordering, loadYears, years]
  );

  const onItemKeyDown = useCallback(
    (event: KeyboardEvent<HTMLLIElement>, index: number) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        void moveYear(index, -1);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        void moveYear(index, 1);
      }
    },
    [moveYear]
  );

  const totalYears = years.length;
  const isEmpty = !loading && totalYears === 0;
  const formTitle = editingId ? '編輯年份' : '新增年份';

  const statusOptions = useMemo(
    () => [
      { value: 'draft' as const, label: STATUS_LABELS.draft },
      { value: 'published' as const, label: STATUS_LABELS.published },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-slate-50/80">
      <AdminPageLayout
        breadcrumbItems={[{ label: '年份管理' }]}
        title="年份管理"
        description="設定網站上的年份列表、顯示順序與狀態，讓前台能正確呈現年度作品。"
        actions={
          <button
            type="button"
            onClick={openCreateForm}
            data-testid="create-year-btn"
            className="inline-flex items-center rounded-md border border-blue-200 bg-white/90 px-3 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
          >
            新增年份
          </button>
        }
        headerExtra={
          <div className="space-y-3">
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              data-testid="years-announce"
              className="sr-only"
            >
              {liveText}
            </div>
            {message && (
              <div
                data-testid={message.type === 'success' ? 'success-message' : 'error-message'}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  message.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        }
        dataTestId="admin-years-page"
      >
        {showForm && (
          <section
            data-testid="year-form"
            className="rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm ring-1 ring-gray-100/60"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{formTitle}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  請輸入年份名稱並選擇狀態。草稿不會顯示在前台。
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  className="mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="year-label-input"
                >
                  年份名稱
                </label>
                <input
                  id="year-label-input"
                  data-testid="year-label-input"
                  value={label}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setLabel(event.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  aria-invalid={!label.trim()}
                  aria-describedby={!label.trim() ? 'year-label-error' : undefined}
                  placeholder="例如：2025"
                  disabled={isSaving}
                />
                {!label.trim() && (
                  <div
                    id="year-label-error"
                    data-testid="field-error"
                    className="mt-1 text-xs text-red-600"
                  >
                    年份名稱為必填欄位
                  </div>
                )}
              </div>

              <div>
                <label
                  className="mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="year-status-select"
                >
                  狀態
                </label>
                <select
                  id="year-status-select"
                  data-testid="year-status-select"
                  value={status}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    setStatus(event.target.value as Year['status'])
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  disabled={isSaving}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveYear}
                data-testid="save-year-btn"
                className="inline-flex items-center rounded-md border border-blue-200 bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSaving}
              >
                儲存
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-2"
              >
                取消
              </button>
            </div>
          </section>
        )}

        <section
          className="rounded-2xl border border-gray-200 bg-white/95 p-0 shadow-sm ring-1 ring-gray-100/60"
          data-testid="year-list-section"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">年份列表</h2>
              <p className="text-xs text-gray-500">共 {totalYears} 筆</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 px-5 py-6 text-sm text-gray-500" data-testid="year-list-loading">
              載入年份資料中…
            </div>
          ) : isEmpty ? (
            <div className="px-5 py-12 text-center text-sm text-gray-500" data-testid="year-empty-state">
              目前尚未建立任何年份，點擊「新增年份」開始設定。
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {years.map((year, index) => (
                <li
                  key={year.id}
                  data-testid="year-item"
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  tabIndex={0}
                  onKeyDown={(event) => onItemKeyDown(event, index)}
                  aria-label={`${year.label} (${STATUS_LABELS[year.status]})`}
                >
                  <div className="flex flex-1 flex-col gap-1 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{year.label}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                          year.status === 'published'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {STATUS_LABELS[year.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>排序：{String(index + 1).padStart(2, '0')}</span>
                      {year.hasCollections ? (
                        <span className="text-blue-600">已指派作品集</span>
                      ) : (
                        <span>尚未指派作品集</span>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex flex-wrap items-center gap-2 sm:justify-end"
                    aria-label="reorder controls"
                  >
                    <div className="flex gap-1">
                      <button
                        type="button"
                        data-testid="move-year-up"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-sm text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                        onClick={() => void moveYear(index, -1)}
                        disabled={index === 0 || isReordering}
                        aria-disabled={index === 0 || isReordering}
                        title="上移"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        data-testid="move-year-down"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-sm text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                        onClick={() => void moveYear(index, 1)}
                        disabled={index === years.length - 1 || isReordering}
                        aria-disabled={index === years.length - 1 || isReordering}
                        title="下移"
                      >
                        ↓
                      </button>
                    </div>
                    <Link
                      href={`/admin/years/${encodeURIComponent(year.id)}`}
                      data-testid="manage-year-workspace"
                      className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                      title="開啟年份工作區"
                    >
                      前往工作區
                    </Link>
                    <button
                      type="button"
                      onClick={() => startEdit(year)}
                      data-testid="edit-year-btn"
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmId(year.id);
                        setIsDialogOpen(true);
                      }}
                      data-testid="delete-year-btn"
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!!year.hasCollections}
                      aria-disabled={!!year.hasCollections}
                      title={year.hasCollections ? '含作品集的年份無法直接刪除' : '刪除此年份'}
                    >
                      刪除
                    </button>
                    {year.hasCollections && (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmForce(true);
                          setConfirmId(year.id);
                          setIsDialogOpen(true);
                        }}
                        data-testid="force-delete-year-btn"
                        className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                        title="強制刪除年份及所有相關作品集，此動作無法復原"
                      >
                        強制刪除
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </AdminPageLayout>

      {confirmId && (
        <AccessibleDialog
          open={isDialogOpen}
          titleId="confirm-title"
          onClose={closeDialog}
          dataTestId="confirm-dialog"
        >
          <div className="mb-3 space-y-2">
            <p id="confirm-title" className="text-sm font-medium text-gray-900">
              {confirmForce ? '確定要強制刪除這個年份？' : '確定要刪除此年份？'}
            </p>
            {confirmForce && (
              <p className="text-sm text-red-700">
                此動作會同時刪除該年份底下的所有作品集與媒體指派，且無法復原，請再次確認。
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            {confirmForce ? (
              <button
                data-autofocus
                data-testid="confirm-force-delete-btn"
                onClick={() => {
                  void deleteYear(confirmId, true);
                  closeDialog();
                }}
                className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
              >
                確認強制刪除
              </button>
            ) : (
              <button
                data-autofocus
                data-testid="confirm-delete-btn"
                onClick={() => {
                  void deleteYear(confirmId);
                  closeDialog();
                }}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                確認刪除
              </button>
            )}
            <button
              onClick={closeDialog}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        </AccessibleDialog>
      )}
    </div>
  );
}
