import { NextRequest } from 'next/server';
import { getR2Bucket } from '@/lib/cloudflare';

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
    const isDev = process.env.NODE_ENV !== 'production';
    const bucket: R2Bucket | undefined = getR2Bucket();
    
    if (!bucket) {
      if (isDev) {
        console.warn('[images] R2 bucket not configured in dev mode');
        return new Response(
          JSON.stringify({ 
            error: 'dev_mode', 
            message: 'R2 bucket not available. Use "npm run dev:worker" for full functionality.',
            requested: { id, variant }
          }),
          { 
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      return new Response('Storage not configured', { status: 500 });
    }

    // Try preferred extensions and fallbacks
    const exts = ['webp', 'avif', 'jpg', 'jpeg', 'png'];
    const variantsToTry: string[] = [variant];
    const versionDelimiterIndex = variant.indexOf('-v');
    if (versionDelimiterIndex > 0) {
      variantsToTry.push(variant.slice(0, versionDelimiterIndex));
    }

    const tryKeys: string[] = [];
    for (const candidate of variantsToTry) {
      for (const ext of exts) {
        tryKeys.push(`images/${id}/${candidate}.${ext}`);
      }
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
        const headers = new Headers();

        if (obj.httpMetadata?.contentType) {
          headers.set('Content-Type', obj.httpMetadata.contentType);
        } else {
          headers.set('Content-Type', ct);
        }
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
