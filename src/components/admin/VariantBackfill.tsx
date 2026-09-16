'use client';

import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'utoa:image-backfill:960-1920:v1';
type Job = { pending: string[]; completed: number; total: number; failed: { id: string; message: string }[] };
const buttonClass = 'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-50 disabled:opacity-50';

export function VariantBackfill({ selectedIds, onUpdated }: {
  selectedIds: string[];
  onUpdated: (id: string) => void;
}) {
  const [job, setJob] = useState<Job | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const stop = useRef(false);
  const busy = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Job | null;
      if (saved && Array.isArray(saved.pending) && saved.pending.every(id => typeof id === 'string') &&
        Array.isArray(saved.failed) && saved.failed.every(item => typeof item.id === 'string' && typeof item.message === 'string') &&
        Number.isInteger(saved.completed) && Number.isInteger(saved.total)) setJob(saved);
    } catch { setMessage('無法讀取上次進度；重新掃描仍會跳過已完成的尺寸。'); }
    return () => { stop.current = true; mounted.current = false; };
  }, []);

  function save(next: Job) {
    if (mounted.current) setJob(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch { if (mounted.current) setMessage('瀏覽器無法保存進度；重新執行時仍會跳過已存在的尺寸。'); }
  }

  async function processJob(initial: Job) {
    let next = initial;
    save(next);
    while (next.pending.length && !stop.current) {
      const id = next.pending[0];
      let failure: string | null = null;
      try {
        const response = await fetch(`/api/admin/uploads/r2/variants/${encodeURIComponent(id)}?scope=new`, {
          method: 'POST', signal: AbortSignal.timeout(65000),
        });
        const result = await response.json() as { ok?: boolean; errors?: string[]; message?: string };
        if (!response.ok || result.ok !== true || !Array.isArray(result.errors) || result.errors.length) {
          failure = result.errors?.join('; ') || result.message || `HTTP ${response.status}`;
        }
        if (response.status === 401 || response.status === 403) {
          if (mounted.current) setMessage('登入已失效，請重新登入後續跑。');
          break;
        }
      } catch (error) { failure = error instanceof Error ? error.message : '連線失敗'; }
      next = {
        ...next, pending: next.pending.slice(1),
        completed: next.completed + (failure ? 0 : 1),
        failed: failure ? [...next.failed, { id, message: failure }] : next.failed,
      };
      save(next);
      if (mounted.current) onUpdated(id);
    }
  }

  async function run(mode: 'all' | 'selected' | 'resume' | 'retry') {
    if (busy.current) return;
    busy.current = true;
    stop.current = false;
    setRunning(true);
    setMessage('');
    try {
      let next: Job;
      if (mode === 'resume' && job) next = job;
      else if (mode === 'retry' && job) next = { ...job, pending: job.failed.map(item => item.id), failed: [] };
      else {
        let ids = [...selectedIds];
        if (mode === 'all') {
          ids = [];
          let offset = 0;
          while (!stop.current) {
            setMessage(`正在掃描素材：${offset} 張…`);
            const response = await fetch(`/api/admin/assets?limit=200&offset=${offset}`, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
            if (!response.ok) throw new Error(`讀取素材失敗（HTTP ${response.status}）`);
            const payload = await response.json() as { data: { id: string }[]; total: number };
            if (!Array.isArray(payload.data) || typeof payload.total !== 'number' ||
              !payload.data.every((asset: { id?: unknown }) => typeof asset.id === 'string')) throw new Error('素材清單格式不正確');
            ids.push(...payload.data.map((asset: { id: string }) => asset.id));
            offset += payload.data.length;
            if (offset >= payload.total) break;
            if (!payload.data.length) throw new Error('素材清單未完整讀取，請重試');
          }
          if (stop.current) return;
        }
        ids = [...new Set(ids)];
        next = { pending: ids, completed: 0, total: ids.length, failed: [] };
      }
      if (mounted.current) setMessage('');
      await processJob(next);
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error ? error.message : '補齊失敗，請稍後重試');
    } finally {
      busy.current = false;
      if (mounted.current) setRunning(false);
    }
  }

  const unfinished = Boolean(job?.pending.length || job?.failed.length);
  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50/70 p-5" aria-labelledby="image-backfill-title">
      <h2 id="image-backfill-title" className="text-base font-semibold text-gray-900">補齊 960 / 1920 圖片尺寸</h2>
      <p className="mt-1 text-sm text-gray-600">只新增缺少的尺寸，保留原圖與現有版本。請保持此頁開啟；離開後可在同一瀏覽器續跑。</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={buttonClass} disabled={running || unfinished} onClick={() => void run('all')}>補齊全部素材</button>
        <button className={buttonClass} disabled={running || unfinished || !selectedIds.length} onClick={() => void run('selected')}>補齊所選（{selectedIds.length}）</button>
        {!!job?.pending.length && !running && <button className={buttonClass} onClick={() => void run('resume')}>繼續上次進度</button>}
        {!!job?.failed.length && !job.pending.length && !running && <button className={buttonClass} onClick={() => void run('retry')}>重試失敗項目（{job.failed.length}）</button>}
        {running && <button className={buttonClass} onClick={() => { stop.current = true; setMessage('本張處理完成後暫停。'); }}>暫停</button>}
      </div>
      <div role="status" aria-live="polite" className="mt-3 text-sm text-gray-700">
        {message && <p>{message}</p>}
        {job && <>
          <progress className="mt-2 h-2 w-full accent-emerald-700" max={Math.max(1, job.total)} value={job.completed + job.failed.length} aria-label="圖片尺寸補齊進度" />
          <p>{running ? '處理中' : job.pending.length ? '已暫停' : job.failed.length ? '部分失敗' : '補齊完成'}：成功 {job.completed} / 失敗 {job.failed.length} / 待處理 {job.pending.length}，共 {job.total} 張。</p>
        </>}
      </div>
      {!!job?.failed.length && <details className="mt-2 text-xs text-red-700"><summary>查看失敗原因</summary><ul className="mt-2 space-y-1">{job.failed.map(item => <li key={item.id}>{item.id}：{item.message}</li>)}</ul></details>}
    </section>
  );
}
