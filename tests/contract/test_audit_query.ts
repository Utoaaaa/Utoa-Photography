import { describe, expect, test, beforeAll } from '@jest/globals';

describe('GET /api/audit Contract Tests (T043)', () => {
  const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000/api';
  const PUB_BASE = process.env.TEST_PUBLISHING_API_BASE || 'http://localhost:3001';
  let collectionId: string;

  beforeAll(async () => {
    // Create year
    const yRes = await fetch(`${API_BASE}/years`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: `Audit-${Date.now()}`, status: 'published' })
    });
    const year = await yRes.json();

    // Create collection via admin API
    const cRes = await fetch(`${API_BASE}/years/${year.id}/collections`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: `audit-${Date.now()}`, title: 'Audit Target' })
    });
    const col = await cRes.json();
    collectionId = col.id;

    // Add minimal asset & SEO via publishing API then publish/unpublish/publish to create history
    await fetch(`${PUB_BASE}/publishing/collections/${collectionId}/assets`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
      body: JSON.stringify({ image_id: 'audit-img-1', alt: 'alt', slide_index: 0 })
    });
    await fetch(`${PUB_BASE}/publishing/collections/${collectionId}/seo`, {
      method: 'PUT', headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
      body: JSON.stringify({ title: 'SEO', description: 'D' })
    });
    await fetch(`${PUB_BASE}/publishing/collections/${collectionId}/publish`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
      body: JSON.stringify({ note: 'A1' })
    });
    await fetch(`${PUB_BASE}/publishing/collections/${collectionId}/unpublish`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
      body: JSON.stringify({ note: 'U1' })
    });
    await fetch(`${PUB_BASE}/publishing/collections/${collectionId}/publish`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
      body: JSON.stringify({ note: 'A2' })
    });
  });

  test('requires auth', async () => {
    const res = await fetch(`${API_BASE}/audit?entity=collection&entity_id=${collectionId}`);
    expect(res.status).toBe(401);
  });

  test('returns paginated results with total', async () => {
    const res = await fetch(`${API_BASE}/audit?entity=collection&entity_id=${collectionId}&limit=2&offset=0`, {
      headers: { authorization: 'Bearer test' }
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      entity: 'collection',
      pagination: { limit: 2, offset: 0, total: expect.any(Number), has_more: expect.any(Boolean) },
      results: expect.any(Array),
    });
    expect(json.results.length).toBeLessThanOrEqual(2);
    expect(json.pagination.total).toBeGreaterThanOrEqual(json.results.length);
  });

  test('filters by action', async () => {
    const res = await fetch(`${API_BASE}/audit?entity=collection&entity_id=${collectionId}&action=unpublish`, {
      headers: { authorization: 'Bearer test' }
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    for (const r of json.results) {
      expect(r.action).toBe('unpublish');
    }
  });

  test('validates query params', async () => {
    const res = await fetch(`${API_BASE}/audit?entity=collection&entity_id=not-a-uuid`, {
      headers: { authorization: 'Bearer test' }
    });
    expect(res.status).toBe(400);
  });
});
