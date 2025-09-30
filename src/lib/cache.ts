// Lazy accessor to next/cache avoiding top-level require/import in non-Next envs
type NextCacheModule = { revalidateTag: (tag: string) => void; revalidatePath: (path: string) => void };
async function loadNextCache(): Promise<NextCacheModule | undefined> {
  try {
    // In Next runtime, this resolves; in tests or non-Next, it may throw
    const mod = (await import('next/cache')) as unknown as NextCacheModule;
    return mod;
  } catch {
    return undefined;
  }
}

export const CACHE_TAGS = {
  YEARS: 'years',
  COLLECTIONS: 'collections',
  ASSETS: 'assets',
  year: (id: string) => `year:${id}`,
  collection: (id: string) => `collection:${id}`,
  yearCollections: (yearId: string) => `collections:year:${yearId}`,
  collectionAssets: (collectionId: string) => `assets:collection:${collectionId}`,
} as const;

import { logAudit } from '@/lib/db';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type RetryOpts = { attempts?: number; baseDelayMs?: number; who?: string; auditOnFailure?: boolean };

/**
 * Revalidate cache tags with retry + exponential backoff and audit on permanent failure.
 */
export async function revalidateTagsWithRetry(tags: string[], opts: RetryOpts = {}) {
  const { attempts = 3, baseDelayMs = 100, who = 'system', auditOnFailure = true } = opts;
  const mod = await loadNextCache();
  const revalidateTag = mod?.revalidateTag;
  const success: string[] = [];
  const failed: Array<{ value: string; error: string }> = [];
  if (!revalidateTag) {
    // Non-Next env: treat as success noop
    return { success: [...tags], failed };
  }
  for (const tag of tags) {
    let lastErr: any = null;
    for (let i = 0; i < attempts; i++) {
      try {
        revalidateTag(tag);
        success.push(tag);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        if (i < attempts - 1) await sleep(baseDelayMs * 2 ** i);
      }
    }
    if (lastErr) {
      failed.push({ value: tag, error: String(lastErr?.message || lastErr) });
      if (auditOnFailure) {
        // Fire-and-forget audit; don't throw if audit fails
        // eslint-disable-next-line no-console
        await logAudit({ who, action: 'revalidate', entity: `tag/${tag}`, metadata: { outcome: 'failed', attempts, error: String(lastErr?.message || lastErr) } }).catch(() => {});
      }
    }
  }
  if (process.env.NODE_ENV !== 'test' && success.length) {
    console.log('Cache invalidated for tags:', success);
  }
  return { success, failed };
}

/**
 * Revalidate paths with retry + exponential backoff and audit on permanent failure.
 */
export async function revalidatePathsWithRetry(paths: string[], opts: RetryOpts = {}) {
  const { attempts = 3, baseDelayMs = 100, who = 'system', auditOnFailure = true } = opts;
  const mod = await loadNextCache();
  const revalidatePath = mod?.revalidatePath;
  const success: string[] = [];
  const failed: Array<{ value: string; error: string }> = [];
  if (!revalidatePath) {
    // Non-Next env: treat as success noop
    return { success: [...paths], failed };
  }
  for (const p of paths) {
    let lastErr: any = null;
    for (let i = 0; i < attempts; i++) {
      try {
        revalidatePath(p);
        success.push(p);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        if (i < attempts - 1) await sleep(baseDelayMs * 2 ** i);
      }
    }
    if (lastErr) {
      failed.push({ value: p, error: String(lastErr?.message || lastErr) });
      if (auditOnFailure) {
        await logAudit({ who, action: 'revalidate', entity: `path/${p}`, metadata: { outcome: 'failed', attempts, error: String(lastErr?.message || lastErr) } }).catch(() => {});
      }
    }
  }
  if (process.env.NODE_ENV !== 'test' && success.length) {
    console.log('Cache invalidated for paths:', success);
  }
  return { success, failed };
}

export async function invalidateCache(tags: string[]) {
  const { failed } = await revalidateTagsWithRetry(tags, { auditOnFailure: true });
  if (failed.length) {
    const err = new Error(`Failed to invalidate tags: ${failed.map(f => f.value).join(', ')}`);
    console.error(err.message);
    throw err;
  }
}

export function getCacheTags() {
  return CACHE_TAGS;
}

// Cache configuration helpers
export const CACHE_CONFIG = {
  // Static cache for years (updates rarely)
  YEARS: {
    revalidate: 3600, // 1 hour
    tags: [CACHE_TAGS.YEARS],
  },
  
  // Dynamic cache for collections (updates more frequently)
  COLLECTIONS: {
    revalidate: 1800, // 30 minutes
    tags: [CACHE_TAGS.COLLECTIONS],
  },
  
  // Short cache for assets (may change frequently during upload)
  ASSETS: {
    revalidate: 300, // 5 minutes
    tags: [CACHE_TAGS.ASSETS],
  },
} as const;