// Image variants configuration (R2-backed)
export const IMAGE_VARIANTS = {
  // Thumbnail variants
  thumb: 'thumb', // 300x300
  small: 'small', // 600x600
  
  // Display variants
  medium: 'medium', // 1200px (longest edge)
  large: 'large', // 3840px (longest edge)
  
  // Special variants
  cover: 'cover', // 1200x900 for collection covers
  og: 'og', // 1200x630 for Open Graph
  blur: 'blur', // Low quality placeholder
  original: 'original', // Original upload
} as const;

export type ImageVariant = keyof typeof IMAGE_VARIANTS;

const FALLBACK_PLACEHOLDER = '/placeholder.svg';
const VARIANT_VERSION_KEY = 'variant_versions';
const VERSION_PATTERN = /^[a-zA-Z0-9_-]+$/;

type VariantVersionMap = Partial<Record<ImageVariant | string, unknown>>;

function parseMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata) return null;
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  } else if (typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return null;
}

function normalizeVersion(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!VERSION_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function getVariantVersion(metadata: unknown, variant: ImageVariant): string | null {
  const parsed = parseMetadata(metadata);
  if (!parsed) return null;
  const versions = parsed[VARIANT_VERSION_KEY];
  if (!versions || typeof versions !== 'object' || Array.isArray(versions)) return null;
  const map = versions as VariantVersionMap;
  const value = map[variant];
  return normalizeVersion(value);
}

function mergeVariantVersion(
  metadata: unknown,
  variant: ImageVariant,
  version?: string | null
): string | null {
  if (version) {
    return normalizeVersion(version);
  }
  return getVariantVersion(metadata, variant);
}

export interface GetImageUrlOptions {
  version?: string | null;
  metadata?: unknown;
}

export function getImageUrl(
  imageId: string,
  variant: ImageVariant = 'medium',
  options?: GetImageUrlOptions
): string {
  if (!imageId) return FALLBACK_PLACEHOLDER;
  const resolvedVariant = IMAGE_VARIANTS[variant];
  const version = mergeVariantVersion(options?.metadata, variant, options?.version);
  const variantPath = version ? `${resolvedVariant}-v${version}` : resolvedVariant;
  // Served via Worker route backed by R2 bucket
  return `/images/${encodeURIComponent(imageId)}/${variantPath}`;
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
  if (width <= 640) variant = 'small';
  else if (width <= 1280) variant = 'medium';
  else variant = 'large';
  return getImageUrl(src, variant);
}

export function getResponsiveSizes(variant: ImageVariant): string {
  switch (variant) {
    case 'thumb':
    case 'small':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw';
    case 'medium':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 1200px';
    case 'large':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 3840px';
    case 'cover':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 400px';
    case 'og':
      return '1200px';
    case 'blur':
      return '40px';
    case 'original':
      return '100vw';
    default:
      return '100vw';
  }
}

export function generateSrcSet(imageId: string, metadata?: unknown): string {
  if (!imageId) return '';
  return [
    `${getImageUrl(imageId, 'small', { metadata })} 600w`,
    `${getImageUrl(imageId, 'medium', { metadata })} 1200w`,
    `${getImageUrl(imageId, 'large', { metadata })} 3840w`,
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
    case 'small':
      return { width: 600, height: 600 };
    case 'medium':
      return { width: 1200, height: 1200 };
    case 'large':
      return { width: 3840, height: 3840 };
    case 'cover':
      return { width: 1200, height: 900 };
    case 'og':
      return { width: 1200, height: 630 };
    case 'blur':
      return { width: 40, height: 40 };
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
export function prefetchImage(
  imageId: string,
  variant: ImageVariant = 'medium',
  options?: GetImageUrlOptions
): void {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = getImageUrl(imageId, variant, options);
    document.head.appendChild(link);
  }
}

export function preloadCriticalImages(
  imageIds: string[],
  variant: ImageVariant = 'medium',
  optionsProvider?: (imageId: string) => GetImageUrlOptions | undefined
): void {
  imageIds.slice(0, 3).forEach(id => prefetchImage(id, variant, optionsProvider?.(id)));
}

export function isCloudflareConfigured(): boolean {
  // For R2-backed images, always true on server side
  return true;
}
