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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`/api/admin/${path}`, {
      method,
      signal: controller.signal,
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
      throw new Error(
        text(error.message) || text(error.error) || `請求失敗（${response.status}）。`
      );
    }
    if (value === null) throw new Error('伺服器未回傳有效資料。');
    return value;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('請求逾時，請重新載入資料。');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
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

export async function loadWorkspace(
  progress: {
    summariesOnly?: boolean;
    selectedCollectionId?: string | null;
    yearsOnly?: boolean;
    yearId?: string;
    assets?: DemoAsset[];
    onYears?: (years: DemoYear[]) => void;
    onWorkspace?: (id: string, workspace: DemoWorkspace) => void;
  } = {}
): Promise<{
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
  if (progress.onYears) progress.onYears(years);
  if (progress.yearsOnly) return { years, workspaces: {} };
  const assets: DemoAsset[] = progress.assets ? [...progress.assets] : [];
  let offset = 0;
  while (!progress.assets && !progress.summariesOnly) {
    const page = row(await requestAdmin(`assets?limit=200&offset=${offset}`));
    const batch = rows(page.data);
    assets.push(...batch.map(mapAsset));
    offset += batch.length;
    if (!batch.length || offset >= Number(page.total)) break;
    if (!Number.isFinite(Number(page.total))) throw new Error('媒體列表缺少總筆數。');
  }
  const workspaces: Record<string, DemoWorkspace> = {};
  const failures: string[] = [];
  await mapConcurrent(
    progress.yearId ? years.filter((year) => year.id === progress.yearId) : years,
    2,
    async (year) => {
      try {
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
        const collections = await mapConcurrent(
          rows(collectionResponse),
          4,
          async (value): Promise<DemoCollection> => {
            const loadPhotos =
              !progress.summariesOnly || idOf(value) === progress.selectedCollectionId;
            const detail = loadPhotos
              ? row(await requestAdmin(`collections/${pathId(idOf(value))}?include_assets=true`))
              : { assets: [] };
            if (loadPhotos) assets.push(...rows(detail.assets).map(mapAsset));
            return {
              id: idOf(value),
              title: text(value.title),
              slug: text(value.slug),
              summary: text(value.summary),
              locationId: text(value.location_id),
              status: status(value.status),
              capturedAt: text(value.captured_at).slice(0, 10),
              coverAssetId: text(value.cover_asset_id) || null,
              photosLoaded: loadPhotos,
              assetCount:
                Number(value.asset_count ?? (value._count as Row | undefined)?.collection_assets) ||
                undefined,
              assetIds: rows(detail.assets)
                .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0))
                .map(idOf),
            };
          }
        );
        // The real asset library is global; include unassigned and cross-year assets as in the existing CMS.
        const knownAssets = new Map(assets.map((asset) => [asset.id, asset]));
        for (const id of [
          ...locations.map((location) => location.coverAssetId),
          ...collections.map((collection) => collection.coverAssetId),
        ]) {
          if (id && !knownAssets.has(id)) knownAssets.set(id, mapAsset({ id, alt: '目前封面' }));
        }
        workspaces[year.id] = { locations, collections, assets: [...knownAssets.values()] };
        if (progress.onWorkspace) progress.onWorkspace(year.id, workspaces[year.id]);
      } catch (error) {
        failures.push(`${year.label}：${error instanceof Error ? error.message : '載入失敗'}`);
      }
    }
  );
  if (failures.length) throw new Error(failures.join('；'));
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

async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await fn(items[index]);
      }
    })
  );
  return results;
}

export async function loadCollectionPhotoIds(collectionId: string): Promise<string[]> {
  const detail = row(await requestAdmin(`collections/${pathId(collectionId)}?include_assets=true`));
  return rows(detail.assets)
    .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0))
    .map(idOf);
}

export async function loadCollectionPhotos(id: string): Promise<DemoAsset[]> {
  const detail = row(await requestAdmin(`collections/${pathId(id)}?include_assets=true`));
  return rows(detail.assets)
    .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0))
    .map(mapAsset);
}

export async function loadCandidatePage(
  locationId: string,
  offset = 0
): Promise<{ assets: DemoAsset[]; total: number }> {
  const page = row(
    await requestAdmin(
      `assets?limit=24&offset=${offset}${locationId ? `&location_id=${pathId(locationId)}` : ''}`
    )
  );
  const total = Number(page.total);
  if (!Number.isFinite(total) || total < 0) throw new Error('媒體列表缺少總筆數。');
  return { assets: rows(page.data).map(mapAsset), total };
}
