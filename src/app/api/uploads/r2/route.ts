import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { getR2Bucket } from '@/lib/cloudflare';
import { regenerateR2Variants } from '@/lib/r2-variants';

function randomId() {
  return Math.random().toString(36).slice(2, 8);
}

const ALLOWED_EXTS = ['jpg','jpeg','png','webp','avif'];
const ALLOWED_VARIANTS = new Set(['thumb', 'medium', 'large', 'original']);

export async function POST(request: NextRequest) {
  try {
    requireAdminAuth(request);

    const url = new URL(request.url);
    const variant = url.searchParams.get('variant') || undefined;
    const providedImageId = url.searchParams.get('image_id') || undefined;

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.startsWith('multipart/form-data')) {
      return NextResponse.json({ error: 'invalid content type', message: 'multipart/form-data required' }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'missing file', message: 'file is required' }, { status: 400 });
    }

    const originalName = file.name || 'upload.jpg';
    const guessedExt = (originalName.split('.').pop() || '').toLowerCase();
    const mimeExt = (file.type || '').includes('webp') ? 'webp'
      : (file.type || '').includes('avif') ? 'avif'
      : ALLOWED_EXTS.includes(guessedExt) ? guessedExt : 'jpg';
    const ext = mimeExt || 'jpg';

    const bucket: R2Bucket | undefined = getR2Bucket();
    if (!bucket) {
      return NextResponse.json({ error: 'storage unavailable' }, { status: 500 });
    }

    const imageId = providedImageId || `r2-${Date.now()}-${randomId()}`;

    if (variant && !ALLOWED_VARIANTS.has(variant)) {
      return NextResponse.json({ error: 'invalid variant' }, { status: 400 });
    }
    if (variant && !providedImageId) {
      return NextResponse.json({ error: 'image_id required for variant upload' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const body = new Uint8Array(arrayBuffer);

    const key = variant
      ? `images/${imageId}/${variant}.${ext}`
      : `images/${imageId}/original.${ext}`;

    await bucket.put(key, body, {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
    } as any);
    if (!variant) {
      try {
        await regenerateR2Variants(imageId, { originalExtHint: ext });
      } catch (error) {
        console.error('[uploads/r2] variant regeneration failed', error);
      }
    }
    return NextResponse.json({ image_id: imageId });
  } catch (error) {
    console.error('[uploads/r2] failed to upload', error);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}

type R2Bucket = {
  put(key: string, value: ArrayBuffer | ArrayBufferView | ReadableStream, options?: any): Promise<void>;
};
