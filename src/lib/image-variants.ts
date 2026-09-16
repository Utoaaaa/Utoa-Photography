// Existing variants retain their width-based geometry. New variants fit inside
// a square, so 960/1920 refer to the longest edge without upscaling originals.
export const RESIZE_VARIANTS = {
  thumb: { width: 300, fit: 'cover' },
  small: { width: 960, height: 960, fit: 'scale-down' },
  medium: { width: 1200, fit: 'contain' },
  desktop: { width: 1920, height: 1920, fit: 'scale-down' },
  large: { width: 3840, fit: 'contain' },
} as const;

export type ResizeVariant = keyof typeof RESIZE_VARIANTS;
export const RESIZE_VARIANT_NAMES = Object.keys(RESIZE_VARIANTS) as ResizeVariant[];
export const NEW_IMAGE_VARIANTS: ResizeVariant[] = ['small', 'desktop'];

export function variantPixelWidth(variant: ResizeVariant, width: number, height: number): number {
  const config = RESIZE_VARIANTS[variant];
  if ('height' in config) {
    return Math.max(1, Math.round(width * Math.min(1, config.width / width, config.height / height)));
  }
  return config.width;
}
