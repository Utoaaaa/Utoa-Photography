import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';

describe('POST /api/years/{year_id}/collections Contract Tests', () => {
  const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000/api';
  let testYearId: string;

  beforeAll(async () => {
    // Create test year
    const yearResponse = await fetch(`${API_BASE}/years`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        label: 'Test Year for Collections POST',
        status: 'published'
      })
    });
    const year = await yearResponse.json();
    testYearId = year.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await fetch(`${API_BASE}/years/${testYearId}?force=true`, { method: 'DELETE' });
  });

  test('POST /api/years/{year_id}/collections - should create collection with required fields', async () => {
    const collectionData = {
      slug: 'minimal-collection',
      title: 'Minimal Collection'
    };

    const response = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(collectionData)
    });

    expect(response.status).toBe(201);

    const collection = await response.json();
    expect(collection).toMatchObject({
      id: expect.any(String),
      year_id: testYearId,
      slug: 'minimal-collection',
      title: 'Minimal Collection',
      status: 'draft', // default status
      order_index: expect.any(String),
      created_at: expect.any(String),
      updated_at: expect.any(String)
    });
  });

  test('POST /api/years/{year_id}/collections - should create collection with all fields', async () => {
    const collectionData = {
      slug: 'full-collection',
      title: 'Full Collection',
      summary: 'A complete test collection with all fields',
      cover_asset_id: 'test-image-id',
      status: 'published',
      order_index: '5.0'
    };

    const response = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(collectionData)
    });

    expect(response.status).toBe(201);

    const collection = await response.json();
    expect(collection).toMatchObject({
      id: expect.any(String),
      year_id: testYearId,
      slug: 'full-collection',
      title: 'Full Collection',
      summary: 'A complete test collection with all fields',
      cover_asset_id: 'test-image-id',
      status: 'published',
      order_index: '5.0'
    });
  });

  test('POST /api/years/{year_id}/collections - should enforce unique slug within year', async () => {
    const collectionData = {
      slug: 'duplicate-slug',
      title: 'First Collection'
    };

    // Create first collection
    const firstResponse = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(collectionData)
    });
    expect(firstResponse.status).toBe(201);

    // Try to create second collection with same slug
    const duplicateData = {
      slug: 'duplicate-slug',
      title: 'Second Collection'
    };

    const secondResponse = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(duplicateData)
    });

    expect(secondResponse.status).toBe(409);
    expect(await secondResponse.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('slug')
    });
  });

  test('POST /api/years/{year_id}/collections - should validate required fields', async () => {
    const invalidData = {
      title: 'Collection without slug'
      // missing slug
    };

    const response = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('slug')
    });
  });

  test('POST /api/years/{year_id}/collections - should validate slug format', async () => {
    const invalidData = {
      slug: 'Invalid Slug With Spaces!',
      title: 'Invalid Slug Collection'
    };

    const response = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('slug')
    });
  });

  test('POST /api/years/{year_id}/collections - should validate status enum', async () => {
    const invalidData = {
      slug: 'invalid-status-collection',
      title: 'Invalid Status Collection',
      status: 'invalid-status'
    };

    const response = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('status')
    });
  });

  test('POST /api/years/{year_id}/collections - should validate title length', async () => {
    const invalidData = {
      slug: 'long-title-collection',
      title: 'x'.repeat(201) // exceeds 200 character limit
    };

    const response = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('title')
    });
  });

  test('POST /api/years/{year_id}/collections - should return 404 for non-existent year', async () => {
    const collectionData = {
      slug: 'orphan-collection',
      title: 'Orphan Collection'
    };

    const response = await fetch(`${API_BASE}/years/non-existent-id/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(collectionData)
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('Year not found')
    });
  });

  test('POST /api/years/{year_id}/collections - should auto-generate order_index if not provided', async () => {
    const collectionData = {
      slug: 'auto-order-collection',
      title: 'Auto Order Collection'
    };

    const response = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(collectionData)
    });

    expect(response.status).toBe(201);

    const collection = await response.json();
    expect(collection.order_index).toBeDefined();
    expect(typeof collection.order_index).toBe('string');
  });
});