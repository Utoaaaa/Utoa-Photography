jest.mock('@/lib/cloudflare', () => ({ getR2Bucket: jest.fn() }));
import { getR2Bucket } from '@/lib/cloudflare';

describe('missing image variant generation', () => {
  const fetchMock = jest.fn();
  let regenerate: typeof import('@/lib/r2-variants').regenerateR2Variants;
  beforeAll(async () => {
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN = 'https://images.example.test';
    ({ regenerateR2Variants: regenerate } = await import('@/lib/r2-variants'));
  });
  beforeEach(() => { fetchMock.mockReset(); global.fetch = fetchMock; });

  it('skips stored sizes without resizing or looking up originals', async () => {
    const bucket = { get: jest.fn().mockResolvedValue({ body: null }), put: jest.fn() };
    (getR2Bucket as jest.Mock).mockReturnValue(bucket);
    const result = await regenerate('photo', { variants: ['small', 'desktop'] });
    expect(result).toEqual({ errors: [], generated: [], skipped: ['small', 'desktop'] });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it('retains successful sizes and reports partial failures for retry', async () => {
    const bucket = { get: jest.fn((key: string) => Promise.resolve(key.includes('/original.jpg') ? { body: null } : null)), put: jest.fn() };
    (getR2Bucket as jest.Mock).mockReturnValue(bucket);
    fetchMock.mockResolvedValueOnce(new Response('image bytes', { headers: { 'content-type': 'image/webp' } })).mockResolvedValueOnce(new Response('failed', { status: 502 }));
    const result = await regenerate('photo', { variants: ['small', 'desktop'], originalExtHint: 'jpg' });
    expect(result.generated).toEqual(['small']);
    expect(result.errors).toEqual(['desktop:Failed to resize desktop: 502']);
    expect(bucket.put).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].cf.image).toEqual(expect.objectContaining({ width: 960, height: 960, fit: 'scale-down', quality: 85 }));
  });

  it('does not store successful HTTP responses containing non-images', async () => {
    (getR2Bucket as jest.Mock).mockReturnValue({ get: jest.fn((key: string) => Promise.resolve(key.includes('/original.jpg') ? { body: null } : null)), put: jest.fn() });
    fetchMock.mockResolvedValue(new Response('<html>Error</html>', { headers: { 'content-type': 'text/html' } }));
    const result = await regenerate('photo', { variants: ['small'] });
    expect(result.generated).toEqual([]);
    expect(result.errors).toEqual(['small:Resizing did not return an image']);
  });
});
