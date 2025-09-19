import { describe, expect, test, beforeAll } from '@jest/globals';

describe('POST /api/revalidate Contract Tests', () => {
  const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000/api';

  test('POST /api/revalidate - should revalidate with cache tags', async () => {
    const requestData = {
      tags: ['years', 'collections:year:123', 'collection:456:assets']
    };

    const response = await fetch(`${API_BASE}/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(200);

    const result = await response.json();
    expect(result).toMatchObject({
      revalidated: expect.any(Array)
    });
    expect(result.revalidated).toEqual(expect.arrayContaining([
      'years',
      'collections:year:123',
      'collection:456:assets'
    ]));
  });

  test('POST /api/revalidate - should revalidate with specific paths', async () => {
    const requestData = {
      tags: ['years'],
      paths: ['/', '/2024', '/2024/spring-collection']
    };

    const response = await fetch(`${API_BASE}/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(200);

    const result = await response.json();
    expect(result).toMatchObject({
      revalidated: expect.any(Array)
    });
    // Should include both tags and paths
    expect(result.revalidated.length).toBeGreaterThan(0);
  });

  test('POST /api/revalidate - should validate required tags field', async () => {
    const requestData = {
      // missing tags
      paths: ['/']
    };

    const response = await fetch(`${API_BASE}/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('tags')
    });
  });

  test('POST /api/revalidate - should validate empty tags array', async () => {
    const requestData = {
      tags: [] // empty array
    };

    const response = await fetch(`${API_BASE}/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('tags')
    });
  });

  test('POST /api/revalidate - should validate tags array contains strings', async () => {
    const requestData = {
      tags: ['valid-tag', 123, null, 'another-valid-tag'] // mixed types
    };

    const response = await fetch(`${API_BASE}/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('tags')
    });
  });

  test('POST /api/revalidate - should validate paths array contains strings', async () => {
    const requestData = {
      tags: ['years'],
      paths: ['/valid-path', 123, '/another-valid-path'] // mixed types
    };

    const response = await fetch(`${API_BASE}/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('paths')
    });
  });

  test('POST /api/revalidate - should handle common cache tag patterns', async () => {
    const requestData = {
      tags: [
        'years:published',
        'collections:year:2024',
        'collection:abc123:assets',
        'seo:homepage',
        'seo:collection:def456'
      ]
    };

    const response = await fetch(`${API_BASE}/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(200);

    const result = await response.json();
    expect(result.revalidated).toEqual(expect.arrayContaining(requestData.tags));
  });

  test('POST /api/revalidate - should handle hierarchy revalidation', async () => {
    const requestData = {
      tags: ['years'], // Should trigger revalidation of year-related caches
      paths: ['/'] // Homepage cache
    };

    const response = await fetch(`${API_BASE}/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(200);

    const result = await response.json();
    expect(Array.isArray(result.revalidated)).toBe(true);
    expect(result.revalidated.length).toBeGreaterThan(0);
  });

  test('POST /api/revalidate - should return specific error for invalid path format', async () => {
    const requestData = {
      tags: ['years'],
      paths: ['invalid-path-without-slash', '/valid-path']
    };

    const response = await fetch(`${API_BASE}/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('path')
    });
  });

  test('POST /api/revalidate - should handle edge case with maximum tag count', async () => {
    // Test with many tags to ensure no performance issues
    const manyTags = Array.from({ length: 100 }, (_, i) => `tag-${i}`);
    const requestData = {
      tags: manyTags
    };

    const response = await fetch(`${API_BASE}/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(200);

    const result = await response.json();
    expect(Array.isArray(result.revalidated)).toBe(true);
    // Should handle all tags (or return appropriate limit error)
    expect(result.revalidated.length).toBeGreaterThan(0);
  });

  test('POST /api/revalidate - should handle partial revalidation failures gracefully', async () => {
    const requestData = {
      tags: ['valid-tag', 'another-valid-tag'],
      paths: ['/valid-path', '/another-valid-path']
    };

    const response = await fetch(`${API_BASE}/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(200);

    const result = await response.json();
    expect(result).toMatchObject({
      revalidated: expect.any(Array)
    });

    // Should include information about any failures (if implementation provides it)
    if (result.failed) {
      expect(Array.isArray(result.failed)).toBe(true);
    }
  });
});