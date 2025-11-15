import { getR2Bucket } from '@/lib/cloudflare';

const R2_PUBLIC_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN;
const OBJECT_PREFIX = process.env.NEXT_PUBLIC_R2_OBJECT_PREFIX || 'images';
const VARIANT_EXT = (process.env.NEXT_PUBLIC_R2_VARIANT_EXT || 'webp').replace(/^\./, '');
const VARIANT_CONTENT_TYPE = VARIANT_EXT === 'jpg' ? 'image/jpeg'
  : VARIANT_EXT === 'jpeg' ? 'image/jpeg'
  : VARIANT_EXT === 'png' ? 'image/png'
  : `image/${VARIANT_EXT}`;

const ORIGINAL_EXTS = ['avif', 'webp', 'jpg', 'jpeg', 'png'] as const;

const VARIANT_CONFIG = {
  thumb: 'w=300,q=85,fit=cover,f=webp',
  medium: 'w=1200,q=85,fit=contain,f=webp',
  large: 'w=3840,q=85,fit=contain,f=webp',
} as const;

type VariantName = keyof typeof VARIANT_CONFIG;
type OriginalExt = typeof ORIGINAL_EXTS[number];

type R2Bucket = {
  get(key: string, options?: { range?: { offset: number; length?: number } }): Promise<{ body: ReadableStream | null } | null>;
  put(key: string, value: ArrayBuffer | ArrayBufferView | ReadableStream, options?: { httpMetadata?: { contentType?: string } }): Promise<void>;
};

function getBucket(): R2Bucket {
  const bucket: R2Bucket | undefined = getR2Bucket();
  if (!bucket) {
    throw new Error('R2 bucket not configured');
  }
  return bucket;
}

async function resolveOriginalExt(bucket: R2Bucket, imageId: string, hint?: string | null): Promise<OriginalExt | null> {
  if (hint) {
    const normalized = hint.replace(/^\./, '').toLowerCase() as OriginalExt;
    if (await objectExists(bucket, imageId, normalized)) {
      return normalized;
    }
  }
  for (const ext of ORIGINAL_EXTS) {
    if (await objectExists(bucket, imageId, ext)) {
      return ext;
    }
  }
  return null;
}

async function objectExists(bucket: R2Bucket, imageId: string, ext: OriginalExt): Promise<boolean> {
  try {
    const key = `images/${imageId}/original.${ext}`;
    const res = await bucket.get(key, { range: { offset: 0, length: 1 } });
    return Boolean(res);
  } catch {
    return false;
  }
}

async function fetchVariantFromResizing(imageId: string, originalExt: OriginalExt, variant: VariantName): Promise<ArrayBuffer> {
  if (!R2_PUBLIC_BASE) {
    throw new Error('R2 public origin is not configured for resizing');
  }
  const encodedId = encodeURIComponent(imageId);
  const sourcePath = `${OBJECT_PREFIX}/${encodedId}/original.${originalExt}`;
  const resizeParams = VARIANT_CONFIG[variant];
  const url = `${R2_PUBLIC_BASE}/cdn-cgi/image/${resizeParams}/${sourcePath}`;
  const res = await fetch(url, {
    headers: { 'Cache-Control': 'no-cache' },
  } as RequestInit & { cf?: Record<string, unknown> });
  if (!res.ok) {
    throw new Error(`Failed to resize ${variant}: ${res.status}`);
  }
  return res.arrayBuffer();
}

export async function regenerateR2Variants(imageId: string, options?: { originalExtHint?: string | null }): Promise<{ errors: string[] }> {
  if (!imageId) {
    throw new Error('imageId is required');
  }
  const bucket = getBucket();
  const originalExt = await resolveOriginalExt(bucket, imageId, options?.originalExtHint);
  if (!originalExt) {
    throw new Error('Original image not found');
  }
  const errors: string[] = [];
  for (const variant of Object.keys(VARIANT_CONFIG) as VariantName[]) {
    try {
      const buffer = await fetchVariantFromResizing(imageId, originalExt, variant);
      const key = `images/${imageId}/${variant}.${VARIANT_EXT}`;
      await bucket.put(key, buffer, {
        httpMetadata: { contentType: VARIANT_CONTENT_TYPE },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[r2-variants] failed to generate variant', { imageId, variant, message });
      errors.push(`${variant}:${message}`);
    }
  }
  return { errors };
}
