describe('public image delivery URLs', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; jest.resetModules(); });

  function loadImages() {
    let images!: typeof import('@/lib/images');
    jest.isolateModules(() => { images = require('@/lib/images'); });
    return images;
  }

  it('uses the public CDN for every browser variant even without build-time env vars', () => {
    delete process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN;
    delete process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_HOST;
    delete process.env.NEXT_PUBLIC_IMAGE_ORIGIN;
    Object.assign(process.env, { NODE_ENV: 'production' });
    const images = loadImages();
    for (const variant of ['thumb', 'small', 'medium', 'desktop', 'large'] as const) {
      expect(images.getImageUrl('photo', variant)).toBe(`https://images.utoa.studio/images/photo/${variant}.webp`);
      expect(images.getR2VariantDirectUrl('photo', variant)).toBe(`https://images.utoa.studio/images/photo/${variant}.webp`);
    }
    expect(images.generateSrcSet('photo', 6000, 4000)).not.toMatch(/(?:^|, )\/images\//);
  });

  it('honors a configured CDN and never special-cases new sizes back to the Worker', () => {
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN = 'https://cdn.example.test';
    process.env.NEXT_PUBLIC_IMAGE_ORIGIN = 'r2_resize';
    const images = loadImages();
    expect(images.getImageUrl('a b', 'small')).toBe('https://cdn.example.test/images/a%20b/small.webp');
    expect(images.getImageUrl('a b', 'desktop')).toBe('https://cdn.example.test/images/a%20b/desktop.webp');
  });
});
