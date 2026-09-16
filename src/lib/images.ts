import { RESIZE_VARIANT_NAMES, variantPixelWidth } from './image-variants';
// Image variants configuration (R2-backed)
export const IMAGE_VARIANTS = {
  // Thumbnail variants
  small: 'small', // 960px longest edge
  desktop: 'desktop', // 1920px longest edge
  thumb: 'thumb', // 300px width (for previews)
  
  // Display variants
  medium: 'medium', // legacy 1200px width
  large: 'large', // legacy 3840px width
  
  original: 'original', // Original upload
} as const;

export type ImageVariant = keyof typeof IMAGE_VARIANTS;

const FALLBACK_PLACEHOLDER = '/placeholder.svg';

// Direct delivery configuration
const RESOLVED_R2_BASE = (() => {
  if (process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN) return process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN;
  if (process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_HOST) return `https://${process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_HOST}`;
  // NEXT_PUBLIC values must be present at build time. Wrangler runtime vars
  // alone do not reach browser bundles: keep this app's public CDN as the
  // production default instead of silently proxying every image through Next.
  return process.env.NODE_ENV === 'production' ? 'https://images.utoa.studio' : undefined;
})();

const IMAGE_ORIGIN = (process.env.NEXT_PUBLIC_IMAGE_ORIGIN || (RESOLVED_R2_BASE ? 'r2_resize' : 'worker')) as 'worker' | 'cf_images' | 'r2_resize';

// Cloudflare Images account hash for imagedelivery.net
const CF_IMAGES_ACCOUNT_HASH = process.env.NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH;

// R2 public base origin, e.g. https://images.utoa.studio
const R2_PUBLIC_BASE_ORIGIN = RESOLVED_R2_BASE;
// Optional path prefix inside the bucket, default 'images'
const R2_OBJECT_PREFIX = process.env.NEXT_PUBLIC_R2_OBJECT_PREFIX || 'images';
// When linking R2 variants directly, choose a canonical extension to avoid probing
const R2_VARIANT_EXT = (process.env.NEXT_PUBLIC_R2_VARIANT_EXT || 'webp').replace(/^\./, '');

export function getImageUrl(imageId: string, variant: ImageVariant = 'medium'): string {
  if (!imageId) return FALLBACK_PLACEHOLDER;

  // 1) Cloudflare Images direct delivery
  if (IMAGE_ORIGIN === 'cf_images' && CF_IMAGES_ACCOUNT_HASH) {
    // Requires you to define variants named: thumb, medium, large, original
    return `https://imagedelivery.net/${CF_IMAGES_ACCOUNT_HASH}/${encodeURIComponent(imageId)}/${IMAGE_VARIANTS[variant]}`;
  }

  // 2) R2 public + (optional) Cloudflare Image Resizing
  if (IMAGE_ORIGIN === 'r2_resize' && R2_PUBLIC_BASE_ORIGIN) {
    if (variant !== 'original') {
      return `${R2_PUBLIC_BASE_ORIGIN}/${R2_OBJECT_PREFIX}/${encodeURIComponent(imageId)}/${IMAGE_VARIANTS[variant]}.${R2_VARIANT_EXT}`;
    }
    // Original files may keep arbitrary extensions; fall back to Worker proxy for negotiation
    return `/images/${encodeURIComponent(imageId)}/original`;
  }

  // 3) Fallback to Worker proxy
  return `/images/${encodeURIComponent(imageId)}/${IMAGE_VARIANTS[variant]}`;
}

// Next.js <Image> custom loader for Cloudflare Images named variants
// Maps requested width to a close variant to avoid overserving bytes.
export function cloudflareImageLoader({
  src,
  width,
}: {
  src: string; // expects Cloudflare Image ID
  width: number;
  quality?: number;
}): string {
  let variant: ImageVariant = 'medium';
  if (width <= 320) variant = 'thumb';
  else if (width <= 960) variant = 'small';
  else if (width <= 1280) variant = 'medium';
  else if (width <= 1920) variant = 'desktop';
  else variant = 'large';
  return getImageUrl(src, variant);
}

export function getResponsiveSizes(variant: ImageVariant): string {
  switch (variant) {
    case 'thumb':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw';
    case 'small':
      return '960px';
    case 'desktop':
      return '1920px';
    case 'medium':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 1200px';
    case 'large':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 3840px';
    case 'original':
      return '100vw';
    default:
      return '100vw';
  }
}

export function generateSrcSet(imageId: string, width?: number | null, height?: number | null, includeNewVariants = true): string {
  if (!imageId) return '';
  // Without original dimensions the new longest-edge variants cannot have an
  // honest width descriptor. Keep the known legacy widths in that case.
  const variants = includeNewVariants && width && height ? RESIZE_VARIANT_NAMES : (['thumb', 'medium', 'large'] as const);
  const candidates = new Map<number, string>();
  for (const variant of variants) {
    const pixels = variantPixelWidth(variant, width || 1200, height || 1200);
    // Legacy contain variants may have been upscaled: do not download more
    // pixels than the original can actually resolve.
    if (includeNewVariants && width && pixels > width && variant !== 'thumb') continue;
    if (!candidates.has(pixels)) candidates.set(pixels, getImageUrl(imageId, variant));
  }
  return [...candidates].sort(([a], [b]) => a - b).map(([pixels, url]) => `${url} ${pixels}w`).join(', ');
}

export interface OptimizedImageProps {
  id: string;
  alt: string;
  variant?: ImageVariant;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
}

export function getImageDimensions(variant: ImageVariant): { width: number; height: number } {
  switch (variant) {
    case 'thumb':
      return { width: 300, height: 300 };
    case 'small':
      return { width: 960, height: 960 };
    case 'desktop':
      return { width: 1920, height: 1920 };
    case 'medium':
      return { width: 1200, height: 1200 };
    case 'large':
      return { width: 3840, height: 3840 };
    case 'original':
      return { width: 4096, height: 4096 };
    default:
      return { width: 1200, height: 1200 };
  }
}

// Image optimization utilities
export function calculateAspectRatio(width: number, height: number): number {
  return width / height;
}

export function getOptimalImageSize(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): { width: number; height: number } {
  const containerRatio = containerWidth / containerHeight;
  const imageRatio = imageWidth / imageHeight;
  
  if (imageRatio > containerRatio) {
    // Image is wider than container
    return {
      width: containerWidth,
      height: containerWidth / imageRatio,
    };
  } else {
    // Image is taller than container
    return {
      width: containerHeight * imageRatio,
      height: containerHeight,
    };
  }
}

// Performance utilities
export function prefetchImage(imageId: string, variant: ImageVariant = 'medium'): void {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = getImageUrl(imageId, variant);
    document.head.appendChild(link);
  }
}

export function preloadCriticalImages(imageIds: string[], variant: ImageVariant = 'medium'): void {
  imageIds.slice(0, 3).forEach(id => prefetchImage(id, variant));
}

export function isCloudflareConfigured(): boolean {
  // For R2-backed images, always true on server side
  return true;
}

function getResizeParamsForVariant(variant: ImageVariant): string | null {
  // Tune these per your preferred quality/policy
  switch (variant) {
    case 'thumb':
      return 'w=300,q=85,fit=cover,f=auto';
    case 'small':
      return 'w=960,h=960,q=85,fit=scale-down,f=auto';
    case 'desktop':
      return 'w=1920,h=1920,q=85,fit=scale-down,f=auto';
    case 'medium':
      return 'w=1200,q=85,fit=contain,f=auto';
    case 'large':
      return 'w=3840,q=85,fit=contain,f=auto';
    case 'original':
      return null; // no resizing
    default:
      return null;
  }
}

export function getR2LargeUrl(imageId: string): string {
  if (!imageId) return '/placeholder.svg';
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN;
  const prefix = process.env.NEXT_PUBLIC_R2_OBJECT_PREFIX || 'images';
  const ext = (process.env.NEXT_PUBLIC_R2_VARIANT_EXT || 'webp').replace(/^\./, '');
  if (base) {
    return `${base}/cdn-cgi/image/w=3840,q=85,fit=contain,f=auto/${prefix}/${encodeURIComponent(imageId)}/large.${ext}`;
  }
  return getImageUrl(imageId, 'large');
}

export function getR2VariantUrl(imageId: string, variant: ImageVariant): string {
  if (!imageId) return '/placeholder.svg';
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN;
  const prefix = process.env.NEXT_PUBLIC_R2_OBJECT_PREFIX || 'images';
  const ext = (process.env.NEXT_PUBLIC_R2_VARIANT_EXT || 'webp').replace(/^\./, '');
  if (base) {
    const params = getResizeParamsForVariant(variant) || '';
    // Always source from large.webp to avoid missing medium/thumb objects
    const sourceVariant = 'large';
    const objectPath = `${prefix}/${encodeURIComponent(imageId)}/${sourceVariant}.${ext}`;
    if (params) {
      return `${base}/cdn-cgi/image/${params}/${objectPath}`;
    }
    return `${base}/${objectPath}`;
  }
  return getImageUrl(imageId, variant);
}

export function getR2VariantDirectUrl(imageId: string, variant: ImageVariant): string {
  if (!imageId) return '/placeholder.svg';
  if (variant === 'small' || variant === 'desktop') return getImageUrl(imageId, variant);
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN;
  const prefix = process.env.NEXT_PUBLIC_R2_OBJECT_PREFIX || 'images';
  const ext = (process.env.NEXT_PUBLIC_R2_VARIANT_EXT || 'webp').replace(/^\./, '');
  if (base) {
    return `${base}/${prefix}/${encodeURIComponent(imageId)}/${IMAGE_VARIANTS[variant]}.${ext}`;
  }
  return getImageUrl(imageId, variant);
}
