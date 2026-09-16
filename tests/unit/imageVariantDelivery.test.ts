jest.mock('@/lib/cloudflare', () => ({ getR2Bucket: jest.fn() }));
import { getR2Bucket } from '@/lib/cloudflare';
import { GET } from '@/app/images/[id]/[variant]/route';
import type { NextRequest } from 'next/server';

describe('new image variant delivery during migration', () => {
  const savedOrigin = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN;
  const savedHost = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_HOST;
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN;
    delete process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_HOST;
  });
  afterAll(() => {
    if (savedOrigin === undefined) delete process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN;
    else process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN = savedOrigin;
    if (savedHost === undefined) delete process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_HOST;
    else process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_HOST = savedHost;
  });

  it('redirects a missing new size to the CDN using only R2 metadata, never image bodies', async () => {
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN = 'https://images.utoa.studio';
    const get = jest.fn(() => { throw new Error('Image bytes must not enter the Worker'); });
    const head = jest.fn((key: string) => Promise.resolve(key.endsWith('/large.webp') ? { key } : null));
    (getR2Bucket as jest.Mock).mockReturnValue({ get, head });
    const response = await GET(new Request('https://site.test/images/photo/desktop') as NextRequest, { params: Promise.resolve({ id: 'photo', variant: 'desktop' }) });
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://images.utoa.studio/images/photo/large.webp');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.body).toBeNull();
    expect(get).not.toHaveBeenCalled();
    expect(head).toHaveBeenCalledTimes(2);
  });

  it('redirects an existing new size without loading or cloning it', async () => {
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN = 'https://images.utoa.studio';
    const get = jest.fn();
    const head = jest.fn().mockResolvedValue({ key: 'images/photo/small.webp' });
    (getR2Bucket as jest.Mock).mockReturnValue({ get, head });
    const response = await GET(new Request('https://site.test/images/photo/small') as NextRequest, { params: Promise.resolve({ id: 'photo', variant: 'small' }) });
    expect(response.headers.get('Location')).toBe('https://images.utoa.studio/images/photo/small.webp');
    expect(response.body).toBeNull();
    expect(get).not.toHaveBeenCalled();
    expect(head).toHaveBeenCalledTimes(1);
  });
  it('serves the legacy size without immutable caching while a new size is missing', async () => {
    const get = jest.fn((key: string) => Promise.resolve(key.includes('/medium.webp') ? { body: 'legacy', httpMetadata: { contentType: 'image/webp' } } : null));
    (getR2Bucket as jest.Mock).mockReturnValue({ get });
    const response = await GET(new Request('https://site.test/images/photo/small') as NextRequest, { params: Promise.resolve({ id: 'photo', variant: 'small' }) });
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Image-Variant')).toBe('medium');
    expect(await response.text()).toBe('legacy');
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('switches to the newly generated object on the next request', async () => {
    (getR2Bucket as jest.Mock).mockReturnValue({ get: jest.fn().mockResolvedValue({ body: '1920', httpMetadata: { contentType: 'image/webp' } }) });
    const response = await GET(new Request('https://site.test/images/photo/desktop') as NextRequest, { params: Promise.resolve({ id: 'photo', variant: 'desktop' }) });
    expect(response.headers.get('Cache-Control')).toContain('immutable');
    expect(response.headers.get('X-Image-Variant')).toBe('desktop');
    expect(await response.text()).toBe('1920');
  });

  it('does not cache a missing image or fall back to a huge original', async () => {
    const get = jest.fn().mockResolvedValue(null);
    (getR2Bucket as jest.Mock).mockReturnValue({ get });
    const response = await GET(new Request('https://site.test/images/photo/desktop') as NextRequest, { params: Promise.resolve({ id: 'photo', variant: 'desktop' }) });
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(get.mock.calls.every(([key]) => !key.includes('original'))).toBe(true);
  });
});
