// Image variants configuration (R2-backed)
export const IMAGE_VARIANTS = {
  // Thumbnail variants
  small: 'small', // 600x600
  
  // Display variants
  medium: 'medium', // 1200px (longest edge)
  large: 'large', // 3840px (longest edge)
  
  original: 'original', // Original upload
} as const;

export type ImageVariant = keyof typeof IMAGE_VARIANTS;

const FALLBACK_PLACEHOLDER = '/placeholder.svg';

export function getImageUrl(imageId: string, variant: ImageVariant = 'medium'): string {
  if (!imageId) return FALLBACK_PLACEHOLDER;
  // Served via Worker route backed by R2 bucket
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
  if (width <= 640) variant = 'small';
  else if (width <= 1280) variant = 'medium';
  else variant = 'large';
  return getImageUrl(src, variant);
}

export function getResponsiveSizes(variant: ImageVariant): string {
  switch (variant) {
    case 'small':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw';
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
    `${getImageUrl(imageId, 'small')} 600w`,
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
    case 'small':
      return { width: 600, height: 600 };
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
