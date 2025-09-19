import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';

describe('PUT /api/collections/{id} Contract Tests', () => {
  const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000/api';
  let testYearId: string;
  let testCollectionId: string;

  beforeAll(async () => {
    // Create test year
    const yearResponse = await fetch(`${API_BASE}/years`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        label: 'Test Year for Collection Update',
        status: 'published'
      })
    });
    const year = await yearResponse.json();
    testYearId = year.id;

    // Create test collection
    const collectionResponse = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'update-collection',
        title: 'Original Title',
        summary: 'Original summary',
        status: 'draft'
      })
    });
    const collection = await collectionResponse.json();
    testCollectionId = collection.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await fetch(`${API_BASE}/years/${testYearId}?force=true`, { method: 'DELETE' });
  });

  test('PUT /api/collections/{id} - should update collection title', async () => {
    const updateData = {
      title: 'Updated Title'
    };

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    expect(response.status).toBe(200);

    const collection = await response.json();
    expect(collection).toMatchObject({
      id: testCollectionId,
      title: 'Updated Title',
      summary: 'Original summary', // unchanged
      status: 'draft', // unchanged
      updated_at: expect.any(String)
    });
  });

  test('PUT /api/collections/{id} - should update multiple fields', async () => {
    const updateData = {
      title: 'Multi Update Title',
      summary: 'Updated summary with new content',
      status: 'published',
      order_index: '10.0'
    };

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    expect(response.status).toBe(200);

    const collection = await response.json();
    expect(collection).toMatchObject({
      id: testCollectionId,
      title: 'Multi Update Title',
      summary: 'Updated summary with new content',
      status: 'published',
      order_index: '10.0',
      updated_at: expect.any(String)
    });
  });

  test('PUT /api/collections/{id} - should update cover_asset_id', async () => {
    const updateData = {
      cover_asset_id: 'new-cover-asset-id'
    };

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    expect(response.status).toBe(200);

    const collection = await response.json();
    expect(collection.cover_asset_id).toBe('new-cover-asset-id');
  });

  test('PUT /api/collections/{id} - should clear cover_asset_id when set to null', async () => {
    const updateData = {
      cover_asset_id: null
    };

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    expect(response.status).toBe(200);

    const collection = await response.json();
    expect(collection.cover_asset_id).toBeNull();
  });

  test('PUT /api/collections/{id} - should validate title length', async () => {
    const updateData = {
      title: 'x'.repeat(201) // exceeds 200 character limit
    };

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('title')
    });
  });

  test('PUT /api/collections/{id} - should validate summary length', async () => {
    const updateData = {
      summary: 'x'.repeat(501) // exceeds 500 character limit
    };

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('summary')
    });
  });

  test('PUT /api/collections/{id} - should validate status enum', async () => {
    const updateData = {
      status: 'invalid-status'
    };

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('status')
    });
  });

  test('PUT /api/collections/{id} - should return 404 for non-existent collection', async () => {
    const updateData = {
      title: 'Update Non-Existent'
    };

    const response = await fetch(`${API_BASE}/collections/non-existent-id`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('Collection not found')
    });
  });

  test('PUT /api/collections/{id} - should require valid UUID format', async () => {
    const updateData = {
      title: 'Update Invalid UUID'
    };

    const response = await fetch(`${API_BASE}/collections/invalid-uuid`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('UUID')
    });
  });

  test('PUT /api/collections/{id} - should handle empty update (no changes)', async () => {
    const updateData = {};

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    expect(response.status).toBe(200);

    const collection = await response.json();
    expect(collection.id).toBe(testCollectionId);
    // updated_at should still be updated
    expect(collection.updated_at).toBeDefined();
  });

  test('PUT /api/collections/{id} - should maintain referential integrity', async () => {
    // Get original data for comparison
    const getResponse = await fetch(`${API_BASE}/collections/${testCollectionId}`);
    const originalCollection = await getResponse.json();

    const updateData = {
      title: 'Integrity Test Title'
    };

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    expect(response.status).toBe(200);

    const updatedCollection = await response.json();
    
    // These fields should remain unchanged
    expect(updatedCollection.id).toBe(originalCollection.id);
    expect(updatedCollection.year_id).toBe(originalCollection.year_id);
    expect(updatedCollection.slug).toBe(originalCollection.slug);
    expect(updatedCollection.created_at).toBe(originalCollection.created_at);
    
    // Only title and updated_at should change
    expect(updatedCollection.title).toBe('Integrity Test Title');
    expect(updatedCollection.updated_at).not.toBe(originalCollection.updated_at);
  });
});