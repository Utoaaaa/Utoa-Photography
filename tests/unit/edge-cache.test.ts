const pendingWrites: Promise<unknown>[] = [];
jest.mock('@/lib/cloudflare', () => ({
  waitUntil: (promise: Promise<unknown>) => pendingWrites.push(promise),
}));

import { cachedPublicData, invalidatePublicData } from '@/lib/edge-cache';

class FakeCache {
  store = new Map<string, string>();
  failReads = false;
  async match(url: string) {
    if (this.failReads) throw new Error('cache unavailable');
    const body = this.store.get(String(url));
    return body === undefined ? undefined : new Response(body);
  }
  async put(url: string, response: Response) {
    this.store.set(String(url), await response.text());
  }
}

describe('edge cache for public data', () => {
  let cache: FakeCache;
  const flush = () => Promise.all(pendingWrites.splice(0));

  beforeEach(() => {
    cache = new FakeCache();
    (globalThis as { caches?: unknown }).caches = { default: cache };
  });
  afterAll(() => {
    delete (globalThis as { caches?: unknown }).caches;
  });

  it('loads once, then serves the cached copy', async () => {
    const load = jest.fn(async () => ({ years: ['2026'] }));
    expect(await cachedPublicData('tree', load)).toEqual({ years: ['2026'] });
    await flush();
    expect(await cachedPublicData('tree', load)).toEqual({ years: ['2026'] });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('caches not-found results too', async () => {
    const load = jest.fn(async () => null);
    await cachedPublicData('collection/2026/missing', load);
    await flush();
    expect(await cachedPublicData('collection/2026/missing', load)).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('serves fresh data after an admin write invalidates the generation', async () => {
    let version = 1;
    const load = jest.fn(async () => ({ version }));
    await cachedPublicData('tree', load);
    await flush();
    version = 2;
    await invalidatePublicData();
    expect(await cachedPublicData('tree', load)).toEqual({ version: 2 });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('falls back to loading when the cache cannot be read', async () => {
    cache.failReads = true;
    const load = jest.fn(async () => 'fresh');
    expect(await cachedPublicData('tree', load)).toBe('fresh');
  });

  it('just loads when there is no Workers cache', async () => {
    delete (globalThis as { caches?: unknown }).caches;
    const load = jest.fn(async () => 'fresh');
    expect(await cachedPublicData('tree', load)).toBe('fresh');
    expect(await cachedPublicData('tree', load)).toBe('fresh');
    expect(load).toHaveBeenCalledTimes(2);
    await expect(invalidatePublicData()).resolves.toBeUndefined();
  });
});
