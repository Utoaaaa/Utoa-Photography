import { waitUntil } from '@/lib/cloudflare';
import { getSiteUrl } from '@/lib/site-url';

/**
 * Per-data-center cache for the public site's read models (Workers Cache API, so no extra
 * bindings). A hit skips D1 entirely; pages still render per request.
 *
 * Freshness: every admin write bumps a generation that is part of each key, so the data center
 * the admin is using serves fresh data immediately. The Cache API is local to one data center,
 * so other data centers refresh when their entries expire, at most PUBLIC_DATA_TTL_SECONDS later.
 *
 * Outside the Workers runtime (next dev / next start / tests) there is no `caches.default`, and on
 * *.workers.dev the Cache API stores nothing; both simply load fresh data every time.
 */
export const PUBLIC_DATA_TTL_SECONDS = 300;

const GENERATION_TTL_SECONDS = 365 * 24 * 60 * 60;

function cacheUrl(path: string) {
  // Keys live under the site's own zone; Workers routes mean visitors never read them directly.
  return `${getSiteUrl()}/__edge-cache/${path}`;
}

function edgeCache(): Cache | null {
  const storage = (globalThis as { caches?: { default?: Cache } }).caches;
  return storage?.default ?? null;
}

async function currentGeneration(cache: Cache): Promise<string> {
  const entry = await cache.match(cacheUrl('generation'));
  return entry ? entry.text() : '0';
}

/** Returns the cached value for `key`, or runs `load` and caches its (JSON-serialisable) result. */
export async function cachedPublicData<T>(key: string, load: () => Promise<T>): Promise<T> {
  const cache = edgeCache();
  if (!cache) return load();

  let url: string;
  try {
    url = cacheUrl(`${encodeURIComponent(key)}?g=${await currentGeneration(cache)}`);
    const hit = await cache.match(url);
    if (hit) return (await hit.json()) as T;
  } catch (error) {
    console.warn('[edge-cache] read failed, loading fresh data', error);
    return load();
  }

  const value = await load();
  const response = new Response(JSON.stringify(value), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${PUBLIC_DATA_TTL_SECONDS}` },
  });
  waitUntil(cache.put(url, response).catch((error) => console.warn('[edge-cache] write failed', error)));
  return value;
}

/** Makes this data center's cached public data stale. Call after every admin write. */
export async function invalidatePublicData(): Promise<void> {
  const cache = edgeCache();
  if (!cache) return;
  try {
    await cache.put(
      cacheUrl('generation'),
      new Response(String(Date.now()), { headers: { 'Cache-Control': `max-age=${GENERATION_TTL_SECONDS}` } }),
    );
  } catch (error) {
    console.warn('[edge-cache] invalidation failed', error);
  }
}
