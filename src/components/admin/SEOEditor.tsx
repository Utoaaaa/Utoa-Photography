'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { requestAdmin } from './workspace/api';
import { resolveSEO } from '@/lib/seo/metadata';
import type { SEOEditorData, SEOFields, SEOTarget } from '@/lib/seo/metadata';

const inputClass = 'mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100';
const buttonClass = 'rounded-lg px-4 py-2.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50';
const targetKey = (target: SEOTarget) => `${target.type}/${encodeURIComponent(target.id)}`;

export default function SEOEditor() {
  const [targets, setTargets] = useState<SEOTarget[]>([]);
  const [selected, setSelected] = useState('homepage/homepage');
  const [data, setData] = useState<SEOEditorData | null>(null);
  const [fields, setFields] = useState<SEOFields | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const dirty = Boolean(data && fields && JSON.stringify(data.fields) !== JSON.stringify(fields));

  useEffect(() => {
    let active = true;
    requestAdmin('seo').then(value => {
      if (active) setTargets((value as { targets: SEOTarget[] }).targets);
    }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    let active = true;
    setData(null); setFields(null); setError(''); setNotice('');
    requestAdmin(`seo/${selected}`).then(value => {
      if (!active) return;
      const loaded = value as SEOEditorData;
      setData(loaded); setFields(loaded.fields);
    }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [selected, reload]);

  useEffect(() => {
    if (!dirty) return;
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [dirty]);

  const preview = data && fields ? resolveSEO({ title: data.target.defaultTitle, description: data.target.defaultDescription }, fields) : null;
  const image = data?.images.find(item => item.id === fields?.og_asset_id) ?? data?.defaultImage;
  const change = (name: keyof SEOFields, value: string) => {
    setFields(current => current ? { ...current, [name]: value || null } : current);
    setNotice('');
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8" data-testid="seo-editor">
      <Link href="/admin/workspace" className="text-sm text-blue-700 hover:underline" onClick={event => {
        if (dirty && !window.confirm('尚有未儲存的 SEO 修改，確定離開？')) event.preventDefault();
      }}>← 內容管理工作區</Link>
      <header className="mb-8 mt-7 border-b border-gray-200 pb-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-blue-700">SEARCH & SHARE</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">搜尋與分享設定</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600">設定搜尋標題、描述與分享封面。網站上顯示的作品名稱、簡介、照片與排版保持原樣。</p>
      </header>
      <div className="mb-7 max-w-xl">
        <label htmlFor="seo-target" className="text-sm font-medium text-gray-800">選擇頁面</label>
        <select id="seo-target" className={inputClass} value={selected} disabled={busy || !targets.length} onChange={event => {
          if (dirty && !window.confirm('尚有未儲存的 SEO 修改，確定切換頁面？')) return;
          setSelected(event.target.value);
        }}>
          {!targets.length && <option value="homepage/homepage">載入頁面列表…</option>}
          {targets.map(target => <option key={targetKey(target)} value={targetKey(target)}>
            {target.type === 'collection' ? '作品集 · ' : target.type === 'location' ? '地點 · ' : ''}{target.label}
          </option>)}
        </select>
      </div>
      {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error} {!data && <button type="button" className="ml-3 underline" onClick={() => setReload(value => value + 1)}>重新載入</button>}
      </div>}
      {!data && !error && <p role="status" className="py-10 text-gray-500">正在載入 SEO 設定…</p>}
      {data && fields && preview && image && <div className="grid items-start gap-8 lg:grid-cols-2">
        <form className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6" onSubmit={async event => {
          event.preventDefault(); setBusy(true); setError(''); setNotice('');
          try {
            const saved = await requestAdmin(`seo/${selected}`, 'PUT', fields) as { fields: SEOFields; warning?: string };
            setData({ ...data, fields: saved.fields }); setFields(saved.fields);
            setNotice(saved.warning ?? 'SEO 設定已儲存。頁面展示內容保持不變。');
          } catch (reason) { setError(reason instanceof Error ? reason.message : '無法儲存，請重試。'); }
          finally { setBusy(false); }
        }}>
          <fieldset disabled={busy} className="space-y-6">
            <legend className="text-lg font-semibold text-gray-950">獨立 SEO 內容</legend>
            <p className="text-sm leading-6 text-gray-500">留空會沿用目前預設值。搜尋與分享使用同一組 SEO 文字。</p>
            <div>
              <label htmlFor="seo-title" className="text-sm font-medium text-gray-800">SEO 標題</label>
              <input id="seo-title" className={inputClass} value={fields.title ?? ''} maxLength={200} placeholder={data.target.defaultTitle} onChange={event => change('title', event.target.value)} />
              <p className="mt-2 text-xs text-gray-500">用於瀏覽器分頁、搜尋結果與分享卡片。</p>
            </div>
            <div>
              <label htmlFor="seo-description" className="text-sm font-medium text-gray-800">SEO 描述</label>
              <textarea id="seo-description" className={inputClass} rows={5} value={fields.description ?? ''} maxLength={500} placeholder={data.target.defaultDescription} onChange={event => change('description', event.target.value)} />
              <p className="mt-2 text-xs text-gray-500">不顯示於頁面正文。請描述作品的真實內容。</p>
            </div>
            <div>
              <label htmlFor="seo-image" className="text-sm font-medium text-gray-800">分享封面</label>
              <select id="seo-image" className={inputClass} value={fields.og_asset_id ?? ''} onChange={event => change('og_asset_id', event.target.value)}>
                <option value="">沿用預設封面</option>
                {data.images.map(item => <option key={item.id} value={item.id}>{item.alt || item.id} · {item.id.slice(0, 8)}</option>)}
              </select>
              <p className="mt-2 text-xs leading-5 text-gray-500">從最近 100 張媒體及目前選用圖片中挑選，不更動作品集展示封面。</p>
            </div>
            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-5">
              <button type="submit" disabled={busy || !dirty} className={`${buttonClass} bg-blue-700 text-white hover:bg-blue-800`}>{busy ? '儲存中…' : '儲存 SEO 設定'}</button>
              <button type="button" disabled={busy || !dirty} className={`${buttonClass} border border-gray-300 text-gray-700`} onClick={() => { setFields(data.fields); setNotice(''); setError(''); }}>還原未儲存修改</button>
            </div>
          </fieldset>
          {notice && <p role="status" className="text-sm leading-6 text-blue-800">{notice}</p>}
        </form>
        <aside className="min-w-0 space-y-7" aria-label="搜尋與分享預覽">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-800">搜尋結果預覽</h2>
            <div className="break-words rounded-2xl border border-gray-200 bg-white p-6" data-testid="seo-search-preview">
              <p className="text-xs text-gray-600">{data.siteUrl}{data.target.path}</p>
              <p className="mt-2 text-xl leading-7 text-blue-800">{preview.title}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">{preview.description}</p>
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-800">分享卡片預覽</h2>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white" data-testid="seo-share-preview">
              {/* Native img mirrors the exact URL emitted into og:image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={image.alt} className="aspect-[1.91/1] w-full bg-slate-100 object-contain" />
              <div className="break-words border-t border-gray-100 p-5">
                <p className="text-xs uppercase tracking-wide text-gray-500">{new URL(data.siteUrl).hostname}</p>
                <p className="mt-2 text-lg font-semibold text-gray-950">{preview.title}</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">{preview.description}</p>
              </div>
            </div>
          </section>
          <p className="text-xs leading-6 text-gray-500">這是預覽示意。Google 可能自行選用摘要，各分享平台也可能裁切圖片或保留舊快取。</p>
          <Link href={data.target.path} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-blue-700 underline underline-offset-4">開啟公開頁面，確認展示內容 ↗</Link>
        </aside>
      </div>}
    </div>
  );
}
