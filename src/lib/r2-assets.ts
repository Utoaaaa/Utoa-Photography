import { getR2Bucket } from '@/lib/cloudflare';

const R2_VARIANTS = ['thumb', 'medium', 'large'] as const;
const R2_EXTS = ['webp', 'avif', 'jpg', 'jpeg', 'png'] as const;

type R2Bucket = {
  delete?(key: string): Promise<void>;
  list?(options: { prefix?: string; limit?: number; cursor?: string; delimiter?: string }): Promise<{
    objects?: { key: string }[];
    truncated?: boolean;
    cursor?: string;
  }>;
};

export async function deleteR2ObjectsForAsset(assetId: string): Promise<void> {
  if (!assetId) return;
  try {
    const bucket = getR2Bucket() as R2Bucket | undefined;
    if (!bucket?.delete) {
      return;
    }

    const keys: string[] = [];
    for (const ext of R2_EXTS) {
      keys.push(`images/${assetId}/original.${ext}`);
    }
    for (const variant of R2_VARIANTS) {
      for (const ext of R2_EXTS) {
        keys.push(`images/${assetId}/${variant}.${ext}`);
      }
    }

    await Promise.allSettled(
      keys.map(async (key) => {
        try {
          await bucket.delete!(key);
        } catch (error) {
          console.warn('[r2-assets] failed to delete object', { key, error });
        }
      }),
    );
  } catch (error) {
    console.warn('[r2-assets] cleanup skipped', error);
  }
}

export function extractImageIdFromKey(key: string): string | null {
  const match = /^images\/([^/]+)\/(original|thumb|medium|large)\./.exec(key);
  return match ? match[1] : null;
}

export async function listR2ImageIds(limit: number, cursor?: string) {
  const bucket = getR2Bucket() as R2Bucket | undefined;
  if (!bucket?.list) {
    throw new Error('R2 bucket listing is not available');
  }

  const result = await bucket.list({
    prefix: 'images/',
    limit,
    cursor,
  });

  const objects = result.objects ?? [];
  const imageIds = new Set<string>();
  for (const obj of objects) {
    const id = extractImageIdFromKey(obj.key);
    if (id) {
      imageIds.add(id);
    }
  }

  return {
    ids: Array.from(imageIds),
    nextCursor: result.truncated ? result.cursor : undefined,
    truncated: Boolean(result.truncated),
  };
}

export type R2ListResult = Awaited<ReturnType<typeof listR2ImageIds>>;
