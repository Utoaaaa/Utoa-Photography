import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';

describe('DELETE /api/collections/{id} Contract Tests', () => {
  const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000/api';
  let testYearId: string;
  let testCollectionId: string;
  let collectionWithAssetsId: string;

  beforeAll(async () => {
    // Create test year
    const yearResponse = await fetch(`${API_BASE}/years`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        label: 'Test Year for Collection Delete',
        status: 'published'
      })
    });
    const year = await yearResponse.json();
    testYearId = year.id;

    // Create test collection for deletion
    const collectionResponse = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'delete-collection',
        title: 'Collection to Delete',
        status: 'draft'
      })
    });
    const collection = await collectionResponse.json();
    testCollectionId = collection.id;

    // Create collection with assets for cleanup testing
    const collectionWithAssetsResponse = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'collection-with-assets',
        title: 'Collection with Assets',
        status: 'draft'
      })
    });
    const collectionWithAssets = await collectionWithAssetsResponse.json();
    collectionWithAssetsId = collectionWithAssets.id;

    // Create and add asset to collection
    await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'test-asset-for-delete',
        alt: 'Test asset for deletion testing',
        width: 1920,
        height: 1080
      })
    });

    await fetch(`${API_BASE}/collections/${collectionWithAssetsId}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        asset_ids: ['test-asset-for-delete']
      })
    });
  });

  afterAll(async () => {
    // Cleanup remaining test data
    await fetch(`${API_BASE}/years/${testYearId}?force=true`, { method: 'DELETE' });
  });

  test('DELETE /api/collections/{id} - should delete collection successfully', async () => {
    const response = await fetch(`${API_BASE}/collections/${testCollectionId}`, {
      method: 'DELETE'
    });

    expect(response.status).toBe(204);

    // Verify collection is deleted
    const getResponse = await fetch(`${API_BASE}/collections/${testCollectionId}`);
    expect(getResponse.status).toBe(404);
  });

  test('DELETE /api/collections/{id} - should delete collection and cleanup asset relationships', async () => {
    const response = await fetch(`${API_BASE}/collections/${collectionWithAssetsId}`, {
      method: 'DELETE'
    });

    expect(response.status).toBe(204);

    // Verify collection is deleted
    const getResponse = await fetch(`${API_BASE}/collections/${collectionWithAssetsId}`);
    expect(getResponse.status).toBe(404);

    // Verify asset still exists (should not be cascade deleted)
    const assetResponse = await fetch(`${API_BASE}/assets/test-asset-for-delete`);
    expect(assetResponse.status).toBe(200); // Asset should still exist
  });

  test('DELETE /api/collections/{id} - should return 404 for non-existent collection', async () => {
    const response = await fetch(`${API_BASE}/collections/non-existent-id`, {
      method: 'DELETE'
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('Collection not found')
    });
  });

  test('DELETE /api/collections/{id} - should require valid UUID format', async () => {
    const response = await fetch(`${API_BASE}/collections/invalid-uuid`, {
      method: 'DELETE'
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('UUID')
    });
  });

  test('DELETE /api/collections/{id} - should handle concurrent deletion gracefully', async () => {
    // Create collection for concurrent deletion test
    const collectionResponse = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'concurrent-delete',
        title: 'Concurrent Delete Collection',
        status: 'draft'
      })
    });
    const collection = await collectionResponse.json();

    // First deletion should succeed
    const firstResponse = await fetch(`${API_BASE}/collections/${collection.id}`, {
      method: 'DELETE'
    });
    expect(firstResponse.status).toBe(204);

    // Second deletion should return 404
    const secondResponse = await fetch(`${API_BASE}/collections/${collection.id}`, {
      method: 'DELETE'
    });
    expect(secondResponse.status).toBe(404);
  });

  test('DELETE /api/collections/{id} - should remove collection from year\'s collection list', async () => {
    // Create collection to verify removal from year
    const collectionResponse = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'year-list-test',
        title: 'Year List Test Collection',
        status: 'published'
      })
    });
    const collection = await collectionResponse.json();

    // Verify collection appears in year's collection list
    const yearCollectionsResponse = await fetch(`${API_BASE}/years/${testYearId}/collections`);
    const yearCollections = await yearCollectionsResponse.json();
    const foundBefore = yearCollections.find((c: any) => c.id === collection.id);
    expect(foundBefore).toBeDefined();

    // Delete collection
    const deleteResponse = await fetch(`${API_BASE}/collections/${collection.id}`, {
      method: 'DELETE'
    });
    expect(deleteResponse.status).toBe(204);

    // Verify collection no longer appears in year's collection list
    const yearCollectionsAfterResponse = await fetch(`${API_BASE}/years/${testYearId}/collections`);
    const yearCollectionsAfter = await yearCollectionsAfterResponse.json();
    const foundAfter = yearCollectionsAfter.find((c: any) => c.id === collection.id);
    expect(foundAfter).toBeUndefined();
  });

  test('DELETE /api/collections/{id} - should handle published collection deletion', async () => {
    // Create published collection
    const collectionResponse = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'published-delete',
        title: 'Published Delete Collection',
        status: 'published'
      })
    });
    const collection = await collectionResponse.json();

    // Delete published collection should work
    const deleteResponse = await fetch(`${API_BASE}/collections/${collection.id}`, {
      method: 'DELETE'
    });
    expect(deleteResponse.status).toBe(204);
  });

  test('DELETE /api/collections/{id} - should cleanup SEO metadata if exists', async () => {
    // Create collection that might have SEO metadata
    const collectionResponse = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'seo-cleanup-test',
        title: 'SEO Cleanup Test Collection',
        status: 'published'
      })
    });
    const collection = await collectionResponse.json();

    // Delete collection (should cleanup any associated SEO metadata)
    const deleteResponse = await fetch(`${API_BASE}/collections/${collection.id}`, {
      method: 'DELETE'
    });
    expect(deleteResponse.status).toBe(204);

    // This test mainly ensures the deletion completes without foreign key constraint errors
    // The actual SEO metadata cleanup is implementation-dependent
  });
});