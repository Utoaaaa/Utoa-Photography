import { RESIZE_VARIANTS, RESIZE_VARIANT_NAMES, type ResizeVariant } from './image-variants';
import { getR2Bucket } from '@/lib/cloudflare';

const R2_PUBLIC_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN;
const OBJECT_PREFIX = process.env.NEXT_PUBLIC_R2_OBJECT_PREFIX || 'images';
const VARIANT_EXT = (process.env.NEXT_PUBLIC_R2_VARIANT_EXT || 'webp').replace(/^\./, '');
const VARIANT_CONTENT_TYPE = VARIANT_EXT === 'jpg' ? 'image/jpeg'
  : VARIANT_EXT === 'jpeg' ? 'image/jpeg'
  : VARIANT_EXT === 'png' ? 'image/png'
  : `image/${VARIANT_EXT}`;
const IMAGE_VARIANT_CACHE_CONTROL = 'public, max-age=31536000, immutable';

const ORIGINAL_EXTS = ['avif', 'webp', 'jpg', 'jpeg', 'png'] as const;

type VariantName = ResizeVariant;

type ImageResizeConfig = {
  width: number;
  height?: number;
  fit: 'cover' | 'contain' | 'scale-down';
  quality?: number;
  format?: 'webp' | 'auto' | 'avif' | 'jpeg' | 'png';
};


type OriginalExt = typeof ORIGINAL_EXTS[number];

type R2Bucket = {
  get(key: string, options?: { range?: { offset: number; length?: number } }): Promise<{ body: ReadableStream | null } | null>;
  put(key: string, value: ArrayBuffer | ArrayBufferView | ReadableStream, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }): Promise<void>;
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
    const key = `${OBJECT_PREFIX}/${imageId}/original.${ext}`;
    const res = await bucket.get(key, { range: { offset: 0, length: 1 } });
    if (res?.body) await res.body.cancel();
    return Boolean(res);
  } catch {
    return false;
  }
}

type ResizeFetchResult = {
  body: ReadableStream;
  contentType: string | null;
};

async function fetchVariantFromResizing(imageId: string, originalExt: OriginalExt, variant: VariantName): Promise<ResizeFetchResult> {
  if (!R2_PUBLIC_BASE) {
    throw new Error('R2 public origin is not configured for resizing');
  }
  const encodedId = encodeURIComponent(imageId);
  const sourcePath = `${OBJECT_PREFIX}/${encodedId}/original.${originalExt}`;
  const cfg = RESIZE_VARIANTS[variant];
  const url = `${R2_PUBLIC_BASE}/${sourcePath}`;
  const cfImage: ImageResizeConfig = {
    ...cfg,
    quality: 85,
    format: (VARIANT_EXT === 'jpg' ? 'jpeg' : VARIANT_EXT) as ImageResizeConfig['format'],
  };
  const res = await fetch(url, {
    signal: AbortSignal.timeout(25000),
    headers: { 'Cache-Control': 'no-cache' },
    cf: { image: cfImage },
  } as RequestInit & { cf?: { image: ImageResizeConfig } });
  if (!res.ok) {
    throw new Error(`Failed to resize ${variant}: ${res.status}`);
  }
  if (!(res.headers.get('content-type') || '').startsWith('image/')) {
    await res.body?.cancel();
    throw new Error('Resizing did not return an image');
  }
  const body = res.body;
  if (!body) {
    throw new Error('No body returned from resizing worker');
  }
  return {
    body,
    contentType: res.headers.get('content-type'),
  };
}

export async function regenerateR2Variants(imageId: string, options?: {
  originalExtHint?: string | null;
  onlyMissing?: boolean;
  variants?: ResizeVariant[];
}): Promise<{ errors: string[]; generated: string[]; skipped: string[] }> {
  if (!imageId || /[\/\\]/.test(imageId)) throw new Error('Invalid imageId');
  const bucket = getBucket();
  const errors: string[] = [];
  const generated: string[] = [];
  const skipped: string[] = [];
  let originalPromise: Promise<OriginalExt | null> | undefined;
  const generate = async (variant: ResizeVariant) => {
    try {
      const key = `${OBJECT_PREFIX}/${imageId}/${variant}.${VARIANT_EXT}`;
      if (options?.onlyMissing !== false) {
        const existing = await bucket.get(key, { range: { offset: 0, length: 1 } });
        if (existing) {
          await existing.body?.cancel();
          skipped.push(variant);
          return;
        }
      }
      originalPromise ??= resolveOriginalExt(bucket, imageId, options?.originalExtHint);
      const originalExt = await originalPromise;
      if (!originalExt) throw new Error('Original image not found');
      const { body, contentType } = await fetchVariantFromResizing(imageId, originalExt, variant);
      await bucket.put(key, body, { httpMetadata: {
        contentType: contentType || VARIANT_CONTENT_TYPE,
        cacheControl: IMAGE_VARIANT_CACHE_CONTROL,
      } });
      generated.push(variant);
    } catch (error) {
      errors.push(`${variant}:${error instanceof Error ? error.message : String(error)}`);
    }
  };
  if (options?.variants) {
    // The backfill endpoint processes only two sizes, one photo per request.
    for (const variant of options.variants) await generate(variant);
  } else {
    // Uploads run inside Next after()/waitUntil: avoid serial transform
    // timeouts consuming the entire background execution window.
    await Promise.all(RESIZE_VARIANT_NAMES.map(generate));
  }
  return { errors, generated, skipped };
}
