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
  request: NextRequest,
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

    // Edge cache: serve from caches.default when available
    const cachesAny = (globalThis as any)?.caches as any;
    const cache: undefined | { match: (req: Request) => Promise<Response | undefined | null>; put: (req: Request, res: Response) => Promise<void> } =
      cachesAny && cachesAny.default ? (cachesAny.default as any) : undefined
    const cacheKey = new Request(new URL(request.url), request as unknown as Request);
    if (cache) {
      const cached = await (cache as any).match(cacheKey);
      if (cached) return cached as Response;
    }

    // Choose a single best extension from Accept header to avoid multiple R2 reads
    const accept = request.headers.get('accept') || '';
    const prefersAvif = /image\/avif/.test(accept);
    const prefersWebp = /image\/webp/.test(accept);
    const preferredExt = prefersAvif ? 'avif' : prefersWebp ? 'webp' : 'jpg';

    // Build a short, deterministic probe list: variant with preferred ext, then JPG fallback, then original with preferred ext
    const tryKeys: string[] = [
      `images/${id}/${variant}.${preferredExt}`,
      preferredExt === 'jpg' ? `images/${id}/${variant}.jpeg` : `images/${id}/${variant}.jpg`,
      `images/${id}/original.${preferredExt}`,
    ];

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

        const response = new Response(obj.body, { status: 200, headers });
        // Store to edge cache for future hits
        if (cache) {
          try { await (cache as any).put(cacheKey, response.clone()); } catch {}
        }
        return response;
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
