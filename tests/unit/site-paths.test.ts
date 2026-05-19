import {
  buildCollectionHref,
  buildHomeHref,
  buildLocationHref,
  buildYearAnchorId,
  buildYearHref,
  normalizeBasePath,
} from '../../src/lib/site-paths';

describe('site path helpers', () => {
  it('normalizes empty and root base paths to an empty prefix', () => {
    expect(normalizeBasePath()).toBe('');
    expect(normalizeBasePath('')).toBe('');
    expect(normalizeBasePath('/')).toBe('');
  });

  it('normalizes classic base paths with one leading slash and no trailing slash', () => {
    expect(normalizeBasePath('/classic')).toBe('/classic');
    expect(normalizeBasePath('/classic/')).toBe('/classic');
    expect(normalizeBasePath('classic')).toBe('/classic');
  });

  it('builds root hrefs', () => {
    expect(buildHomeHref()).toBe('/');
    expect(buildYearAnchorId('2025 Spring')).toBe('year-2025-Spring');
    expect(buildYearHref('2025 Spring')).toBe('/#year-2025-Spring');
    expect(buildLocationHref('2025', 'taipei-25')).toBe('/2025/taipei-25');
    expect(buildCollectionHref('2025', 'taipei-25', 'night-platform')).toBe('/2025/taipei-25/night-platform');
  });

  it('builds classic hrefs and normalizes trailing slashes', () => {
    expect(buildHomeHref('/classic')).toBe('/classic');
    expect(buildHomeHref('/classic/')).toBe('/classic');
    expect(buildYearHref('2025 Spring', '/classic')).toBe('/classic#year-2025-Spring');
    expect(buildLocationHref('2025', 'taipei-25', '/classic')).toBe('/classic/2025/taipei-25');
    expect(buildLocationHref('2025', 'taipei-25', '/classic/')).toBe('/classic/2025/taipei-25');
  });

  it('encodes route segments without double slashes', () => {
    const href = buildCollectionHref('2025 Spring', 'taipei-25', 'night walk', '/classic/');

    expect(href).toBe('/classic/2025%20Spring/taipei-25/night%20walk');
    expect(href).not.toContain('//');
  });
});
