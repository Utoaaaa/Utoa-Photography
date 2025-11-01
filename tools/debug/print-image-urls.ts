/*
  Quick local check to print image URLs for R2 direct delivery.
  Usage:
    node -r ts-node/register tools/debug/print-image-urls.ts <imageId>
*/

// Ensure env for r2_resize (override if passed from shell)
process.env.NEXT_PUBLIC_IMAGE_ORIGIN = process.env.NEXT_PUBLIC_IMAGE_ORIGIN || 'r2_resize';
process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN || 'https://images.utoa.studio';
process.env.NEXT_PUBLIC_R2_OBJECT_PREFIX = process.env.NEXT_PUBLIC_R2_OBJECT_PREFIX || 'images';
// If you store webp variants, this is used only in variant-direct mode. Not used in original-only mode.
process.env.NEXT_PUBLIC_R2_VARIANT_EXT = process.env.NEXT_PUBLIC_R2_VARIANT_EXT || 'webp';

import { getImageUrl } from '../../src/lib/images';

const id = process.argv[2] || 'example-id';

console.log('Config:');
console.log('  IMAGE_ORIGIN =', process.env.NEXT_PUBLIC_IMAGE_ORIGIN);
console.log('  R2_BASE =', process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN);
console.log('  PREFIX =', process.env.NEXT_PUBLIC_R2_OBJECT_PREFIX);
console.log('');
console.log('URLs:');
console.log('  thumb :', getImageUrl(id, 'thumb'));
console.log('  medium:', getImageUrl(id, 'medium'));
console.log('  large :', getImageUrl(id, 'large'));
