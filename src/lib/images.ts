// Cloudflare Images variants configuration
export const IMAGE_VARIANTS = {
  // Thumbnail variants
  thumb: 'thumb', // 300x300
  small: 'small', // 600x600
  
  // Display variants
  medium: 'medium', // 1200x1200
  large: 'large', // 1920x1920
  
  // Special variants
  cover: 'cover', // 800x600 for collection covers
  og: 'og', // 1200x630 for Open Graph
  blur: 'blur', // Low quality placeholder
} as const;

export type ImageVariant = keyof typeof IMAGE_VARIANTS;

export function getImageUrl(
  imageId: string, 
  variant: ImageVariant = 'medium',
  accountHash?: string
): string {
  const hash = accountHash || process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
  
  if (!hash) {
    console.warn('Cloudflare account hash not configured');
    return '/placeholder.jpg';
  }
  
  return `https://imagedelivery.net/${hash}/${imageId}/${IMAGE_VARIANTS[variant]}`;
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
      return '(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 1920px';
    case 'cover':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 400px';
    case 'og':
      return '1200px';
    case 'blur':
      return '40px';
    default:
      return '100vw';
  }
}

export function generateSrcSet(imageId: string, accountHash?: string): string {
  const hash = accountHash || process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
  
  if (!hash) {
    return '';
  }
  
  return [
    `${getImageUrl(imageId, 'small', hash)} 600w`,
    `${getImageUrl(imageId, 'medium', hash)} 1200w`,
    `${getImageUrl(imageId, 'large', hash)} 1920w`,
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
      return { width: 1920, height: 1920 };
    case 'cover':
      return { width: 800, height: 600 };
    case 'og':
      return { width: 1200, height: 630 };
    case 'blur':
      return { width: 40, height: 40 };
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