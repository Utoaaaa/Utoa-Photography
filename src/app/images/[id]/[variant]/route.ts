import { NextRequest } from 'next/server';
import { getR2Bucket } from '@/lib/cloudflare';

const CONTENT_TYPES: Record<string, string> = {
  webp: 'image/webp',
  avif: 'image/avif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

type EdgeCache = {
  match(request: Request): Promise<Response | undefined | null>;
  put(request: Request, response: Response): Promise<void>;
};

type CacheStorageWithDefault = CacheStorage & {
  default?: EdgeCache;
};

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildLocalTestSvg(id: string, variant: string): string {
  const isPortrait = id.includes('portrait') || id.endsWith('urban-02') || id.endsWith('spring-03');
  const width = isPortrait ? 1080 : 1600;
  const height = isPortrait ? 1620 : 1067;
  const label = escapeSvgText(`${id.replace(/^local-test-image-/, '')} / ${variant}`);
  const titleY = isPortrait ? 1450 : 940;
  const labelY = isPortrait ? 1532 : 1010;
  const ridgePath = isPortrait
    ? 'M0 1210 C170 1080 310 1340 490 1160 C690 960 810 1210 1080 1040 L1080 1620 L0 1620 Z'
    : 'M0 790 C260 690 390 900 640 760 C940 590 1110 760 1600 585 L1600 1067 L0 1067 Z';
  const accentA = isPortrait ? { cx: 260, cy: 420, r: 150 } : { cx: 330, cy: 300, r: 160 };
  const accentB = isPortrait ? { cx: 760, cy: 600, r: 210 } : { cx: 1090, cy: 360, r: 220 };

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">
    <defs>
      <linearGradient id="paper" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#fff7d6"/>
        <stop offset="0.48" stop-color="#dff5ff"/>
        <stop offset="1" stop-color="#f9d2e7"/>
      </linearGradient>
      <radialGradient id="flare" cx="68%" cy="22%" r="58%">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.82"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#paper)"/>
    <rect width="${width}" height="${height}" fill="url(#flare)"/>
    <path d="${ridgePath}" fill="#111827" fill-opacity="0.12"/>
    <circle cx="${accentA.cx}" cy="${accentA.cy}" r="${accentA.r}" fill="#01aff6" fill-opacity="0.18"/>
    <circle cx="${accentB.cx}" cy="${accentB.cy}" r="${accentB.r}" fill="#f20085" fill-opacity="0.13"/>
    <text x="72" y="${titleY}" fill="#111827" font-family="Georgia, 'Times New Roman', serif" font-size="${isPortrait ? 62 : 72}" letter-spacing="-2">UTOA local test image</text>
    <text x="76" y="${labelY}" fill="#111827" fill-opacity="0.62" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${isPortrait ? 24 : 28}" letter-spacing="5">${label}</text>
  </svg>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variant: string }> }
) {
  const { id, variant } = await params;
  const localTestImagesEnabled = process.env.UTOA_ENABLE_LOCAL_TEST_DATA === 'true'
    || process.env.NODE_ENV !== 'production';
  if (localTestImagesEnabled && id.startsWith('local-test-image-')) {
    return new Response(buildLocalTestSvg(id, variant), {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  // New variants are served through a stable URL during backfill. Never cache
  // a fallback as immutable, or it would hide a subsequently generated size.
  if (variant === 'small' || variant === 'desktop') {
    try {
      const prefix = process.env.NEXT_PUBLIC_R2_OBJECT_PREFIX || 'images';
      const ext = (process.env.NEXT_PUBLIC_R2_VARIANT_EXT || 'webp').replace(/^\./, '');
      const bucket: R2Bucket | undefined = getR2Bucket();
      if (!bucket) return new Response('Storage unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
      const cache = typeof caches !== 'undefined' ? (caches as CacheStorageWithDefault).default : undefined;
      const cacheKey = new Request(request.url);
      const cached = await cache?.match(cacheKey);
      if (cached) return cached;
      const fallback = variant === 'small' ? 'medium' : 'large';
      for (const candidate of [variant, fallback]) {
        const object = await bucket.get(`${prefix}/${id}/${candidate}.${ext}`);
        if (!object) continue;
        const exact = candidate === variant;
        const response = new Response(object.body, { headers: {
          'Content-Type': object.httpMetadata?.contentType || CONTENT_TYPES[ext] || 'image/webp',
          'Cache-Control': exact ? 'public, max-age=31536000, immutable' : 'no-store',
          'X-Image-Variant': candidate,
        } });
        if (exact && cache) {
          try { await cache.put(cacheKey, response.clone()); } catch { /* delivery still succeeds */ }
        }
        return response;
      }
      return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
    } catch {
      return new Response('Image unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  }

  // If R2 public origin is configured, redirect to direct R2 variant URL to bypass Worker
  const R2_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN;
  const R2_PREFIX = process.env.NEXT_PUBLIC_R2_OBJECT_PREFIX || 'images';
  const R2_EXT = (process.env.NEXT_PUBLIC_R2_VARIANT_EXT || 'webp').replace(/^\./, '');
  if (R2_BASE && ['thumb','medium','large'].includes(variant)) {
    const paramsMap: Record<string,string> = { thumb: 'w=300,q=85,fit=cover,f=auto', medium: 'w=1200,q=85,fit=contain,f=auto', large: 'w=3840,q=85,fit=contain,f=auto' };
    const r = paramsMap[variant] || '';
    const target = `${R2_BASE}/cdn-cgi/image/${r}/${R2_PREFIX}/${encodeURIComponent(id)}/${variant}.${R2_EXT}`;
    return Response.redirect(target, 302);
  }
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
    const runtimeCaches = typeof caches === 'undefined'
      ? undefined
      : (caches as CacheStorageWithDefault);
    const cache = runtimeCaches?.default;
    const cacheKey = new Request(new URL(request.url), request as unknown as Request);
    if (cache) {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
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
          try {
            await cache.put(cacheKey, response.clone());
          } catch (cacheError) {
            console.warn('[images] failed to store edge cache entry', cacheError);
          }
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
