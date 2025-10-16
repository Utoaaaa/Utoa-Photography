import { NextRequest } from 'next/server';

const CONTENT_TYPES: Record<string, string> = {
  webp: 'image/webp',
  avif: 'image/avif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; variant: string }> }
) {
  const { id, variant } = await params;
  try {
    // Access R2 bucket from Cloudflare bindings
    // @ts-ignore
    const { getRequestContext } = await import('next/server');
    const ctx = getRequestContext?.();
    const bucket: R2Bucket | undefined = ctx?.cloudflare?.env?.ASSETS as any;
    if (!bucket) {
      return new Response('Storage not configured', { status: 500 });
    }

    // Try preferred extensions and fallbacks
    const exts = ['webp', 'avif', 'jpg', 'jpeg', 'png'];
    const tryKeys: string[] = [];
    for (const ext of exts) {
      tryKeys.push(`images/${id}/${variant}.${ext}`);
    }
    // Fallback to original if variant not found
    for (const ext of exts) {
      tryKeys.push(`images/${id}/original.${ext}`);
    }

    for (const key of tryKeys) {
      const obj = await bucket.get(key);
      if (obj) {
        const ext = key.split('.').pop() || 'jpg';
        const ct = CONTENT_TYPES[ext] || 'application/octet-stream';
        const headers = new Headers(obj.httpMetadata?.contentType ? undefined : { 'Content-Type': ct });
        // Long cache for immutable images
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        if (obj.httpMetadata?.contentLanguage) headers.set('Content-Language', obj.httpMetadata.contentLanguage);
        if (obj.httpMetadata?.contentDisposition) headers.set('Content-Disposition', obj.httpMetadata.contentDisposition);
        if (obj.httpMetadata?.cacheControl) headers.set('Cache-Control', obj.httpMetadata.cacheControl);
        return new Response(obj.body, { status: 200, headers });
      }
    }

    return new Response('Not found', { status: 404 });
  } catch (error) {
    console.error('[images] error serving image', error);
    return new Response('Internal server error', { status: 500 });
  }
}

type R2Bucket = {
  get(key: string): Promise<{
    body: ReadableStream;
    httpMetadata?: { contentType?: string; contentLanguage?: string; contentDisposition?: string; cacheControl?: string };
  } | null>;
};

