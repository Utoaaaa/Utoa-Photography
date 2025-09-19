import { revalidateTag } from 'next/cache';

export const CACHE_TAGS = {
  YEARS: 'years',
  COLLECTIONS: 'collections',
  ASSETS: 'assets',
  year: (id: string) => `year:${id}`,
  collection: (id: string) => `collection:${id}`,
  yearCollections: (yearId: string) => `collections:year:${yearId}`,
  collectionAssets: (collectionId: string) => `assets:collection:${collectionId}`,
} as const;

export async function invalidateCache(tags: string[]) {
  try {
    for (const tag of tags) {
      revalidateTag(tag);
    }
    console.log('Cache invalidated for tags:', tags);
  } catch (error) {
    console.error('Failed to invalidate cache:', error);
    throw error;
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