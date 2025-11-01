// Simple URL preview for R2 variant direct + Resizing
const id = process.argv[2] || 'example-id';
const origin = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN || 'https://images.utoa.studio';
const prefix = process.env.NEXT_PUBLIC_R2_OBJECT_PREFIX || 'images';
const ext = (process.env.NEXT_PUBLIC_R2_VARIANT_EXT || 'webp').replace(/^\./, '');

const params = {
  thumb: 'w=300,q=85,fit=cover,f=auto',
  medium: 'w=1200,q=85,fit=contain,f=auto',
  large: 'w=3840,q=85,fit=contain,f=auto',
};

function urlFor(variant) {
  const objectPath = `${prefix}/${encodeURIComponent(id)}/${variant}.${ext}`;
  const p = params[variant];
  return `${origin}/cdn-cgi/image/${p}/${objectPath}`;
}

console.log('Config:');
console.log('  origin =', origin);
console.log('  prefix =', prefix);
console.log('  ext    =', ext);
console.log('');
console.log('URLs:');
console.log('  thumb :', urlFor('thumb'));
console.log('  medium:', urlFor('medium'));
console.log('  large :', urlFor('large'));
