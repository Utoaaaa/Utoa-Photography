import type { DemoAsset, DemoCollection, DemoWorkspace, DemoYear } from './types';
import { getImageUrl } from '@/lib/images';

type Row = Record<string, unknown>;
const row = (value: unknown): Row => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('伺服器回傳的資料格式不正確。');
  return value as Row;
};
const rows = (value: unknown): Row[] => {
  if (!Array.isArray(value)) throw new Error('伺服器回傳的列表格式不正確。');
  return value.map(row);
};
const text = (value: unknown) => (typeof value === 'string' ? value : '');
const idOf = (value: Row) => {
  const id = text(value.id);
  if (!id) throw new Error('伺服器回傳的資料缺少 ID。');
  return id;
};
const status = (value: unknown): 'draft' | 'published' => {
  if (value !== 'draft' && value !== 'published') throw new Error('伺服器回傳未知的發布狀態。');
  return value;
};
export const pathId = (id: string) => encodeURIComponent(id);

export async function requestAdmin(path: string, method = 'GET', body?: unknown): Promise<unknown> {
  const response = await fetch(`/api/admin/${path}`, {
    method,
    cache: 'no-store',
    credentials: 'same-origin',
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  if (response.status === 204) return null;
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error('登入已失效，請重新登入管理後台。');
    if (response.status === 403) throw new Error('目前帳號沒有管理權限。');
    const error = value && typeof value === 'object' ? (value as Row) : {};
    throw new Error(text(error.message) || text(error.error) || `請求失敗（${response.status}）。`);
  }
  if (value === null) throw new Error('伺服器未回傳有效資料。');
  return value;
}

function mapAsset(value: Row): DemoAsset {
  const id = idOf(value);
  return {
    id,
    title: text(value.title) || text(value.alt) || id,
    alt: text(value.alt),
    description: text(value.caption),
    locationId: text(value.location_folder_id),
    status: 'draft',
    ratio: `${Number(value.width) || 1}:${Number(value.height) || 1}`,
    width: Number(value.width) || undefined,
    height: Number(value.height) || undefined,
    tone: 'from-slate-100 to-slate-200',
    variants: [],
    imageSrc: getImageUrl(id, 'small'),
  };
}

export async function loadWorkspace(): Promise<{
  years: DemoYear[];
  workspaces: Record<string, DemoWorkspace>;
}> {
  const yearRows = rows(await requestAdmin('years?status=all&order=asc'));
  const years = yearRows.map((value) => ({
    id: idOf(value),
    label: text(value.label),
    status: status(value.status),
    locations: 0,
    collections: 0,
    assets: 0,
    updatedAt: text(value.updated_at),
  }));
  const assets: DemoAsset[] = [];
  let offset = 0;
  while (true) {
    const page = row(await requestAdmin(`assets?limit=200&offset=${offset}`));
    const batch = rows(page.data);
    assets.push(...batch.map(mapAsset));
    offset += batch.length;
    if (!batch.length || offset >= Number(page.total)) break;
    if (!Number.isFinite(Number(page.total))) throw new Error('媒體列表缺少總筆數。');
  }
  const workspaces: Record<string, DemoWorkspace> = {};
  for (const year of years) {
    const [locationResponse, collectionResponse] = await Promise.all([
      requestAdmin(`years/${pathId(year.id)}/locations`),
      requestAdmin(`years/${pathId(year.id)}/collections?status=all`),
    ]);
    const locations = rows(locationResponse).map((value) => ({
      id: idOf(value),
      name: text(value.name),
      slug: text(value.slug),
      summary: text(value.summary),
      coverAssetId: text(value.coverAssetId) || null,
      status: 'draft' as const,
    }));
    const collections: DemoCollection[] = [];
    for (const value of rows(collectionResponse)) {
      const detail = row(
        await requestAdmin(`collections/${pathId(idOf(value))}?include_assets=true`)
      );
      collections.push({
        id: idOf(value),
        title: text(value.title),
        slug: text(value.slug),
        summary: text(value.summary),
        locationId: text(value.location_id),
        status: status(value.status),
        capturedAt: text(value.captured_at).slice(0, 10),
        coverAssetId: text(value.cover_asset_id) || null,
        assetIds: rows(detail.assets)
          .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0))
          .map(idOf),
      });
    }
    // The real asset library is global; include unassigned and cross-year assets as in the existing CMS.
    workspaces[year.id] = { locations, collections, assets };
  }
  return { years, workspaces };
}

export async function saveCollection(previous: DemoCollection, next: DemoCollection) {
  if (!next.title.trim() || !next.slug.trim()) throw new Error('作品集名稱與 Slug 皆為必填。');
  if (next.status === 'published' && !next.locationId)
    throw new Error('請先指派地點，再發布作品集。');
  const path = `collections/${pathId(next.id)}`;
  // Assignment has its own validation and audit trail. Do not silently send ignored location_id fields.
  if (previous.locationId !== next.locationId) {
    await requestAdmin(`${path}/location`, 'POST', { locationId: next.locationId || null });
  }
  await requestAdmin(path, 'PUT', {
    title: next.title,
    slug: next.slug,
    summary: next.summary,
    status: next.status,
    captured_at: next.capturedAt || null,
    cover_asset_id: next.coverAssetId,
  });
}

export async function savePhotos(collection: DemoCollection, ids: string[]) {
  const path = `collections/${pathId(collection.id)}/assets`;
  const added = ids.filter((id) => !collection.assetIds.includes(id));
  if (added.length) await requestAdmin(path, 'POST', { asset_ids: added });
  for (const id of collection.assetIds.filter((id) => !ids.includes(id))) {
    await requestAdmin(`${path}/${pathId(id)}`, 'DELETE');
  }
  if (ids.length)
    await requestAdmin(path, 'PUT', {
      reorder: ids.map((asset_id, index) => ({
        asset_id,
        order_index: String(index + 1).padStart(8, '0'),
      })),
    });
}

export async function persistOrder(kind: 'years' | 'collections', ids: string[]) {
  // Existing API persists one row at a time; callers must reload after partial failure.
  for (let index = 0; index < ids.length; index++) {
    await requestAdmin(`${kind}/${pathId(ids[index])}`, 'PUT', {
      order_index: String(index + 1).padStart(4, '0'),
    });
  }
}
