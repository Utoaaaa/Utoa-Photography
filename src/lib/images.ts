// Image variants configuration (R2-backed)
export const IMAGE_VARIANTS = {
  // Thumbnail variants
  thumb: 'thumb', // 300x300 (for admin previews)
  
  // Display variants
  medium: 'medium', // 1200px (longest edge)
  large: 'large', // 3840px (longest edge)
  
  original: 'original', // Original upload
} as const;

export type ImageVariant = keyof typeof IMAGE_VARIANTS;

const FALLBACK_PLACEHOLDER = '/placeholder.svg';

// Direct delivery configuration
const IMAGE_ORIGIN = (process.env.NEXT_PUBLIC_IMAGE_ORIGIN || (process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN ? 'r2_resize' : 'worker')) as 'worker' | 'cf_images' | 'r2_resize';

// Cloudflare Images account hash for imagedelivery.net
const CF_IMAGES_ACCOUNT_HASH = process.env.NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH;

// R2 public base origin, e.g. https://images.utoa.studio
const R2_PUBLIC_BASE_ORIGIN = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN;
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
    // If you already generate variants per id, link them directly with a fixed extension
    // Example path: https://images.utoa.studio/images/<id>/<variant>.webp
    const objectPath = `${R2_OBJECT_PREFIX}/${encodeURIComponent(imageId)}/${IMAGE_VARIANTS[variant]}.${R2_VARIANT_EXT}`;
    const resizingParams = getResizeParamsForVariant(variant);
    if (resizingParams) {
      return `${R2_PUBLIC_BASE_ORIGIN}/cdn-cgi/image/${resizingParams}/${objectPath}`;
    }
    return `${R2_PUBLIC_BASE_ORIGIN}/${objectPath}`;
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
  else if (width <= 1280) variant = 'medium';
  else variant = 'large';
  return getImageUrl(src, variant);
}

export function getResponsiveSizes(variant: ImageVariant): string {
  switch (variant) {
    case 'thumb':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw';
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

export function generateSrcSet(imageId: string): string {
  if (!imageId) return '';
  return [
    `${getImageUrl(imageId, 'thumb')} 300w`,
    `${getImageUrl(imageId, 'medium')} 1200w`,
    `${getImageUrl(imageId, 'large')} 3840w`,
  ].join(', ');
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
