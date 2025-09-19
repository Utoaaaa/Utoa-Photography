import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';

describe('POST /api/collections/{id}/assets Contract Tests', () => {
  const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000/api';
  let testYearId: string;
  let testCollectionId: string;
  let testAssetIds: string[] = [];

  beforeAll(async () => {
    // Create test year
    const yearResponse = await fetch(`${API_BASE}/years`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        label: 'Test Year for Collection Assets',
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
        slug: 'assets-test-collection',
        title: 'Assets Test Collection',
        status: 'published'
      })
    });
    const collection = await collectionResponse.json();
    testCollectionId = collection.id;

    // Create test assets
    const assetPromises = [];
    for (let i = 1; i <= 5; i++) {
      assetPromises.push(
        fetch(`${API_BASE}/assets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: `test-asset-${i}`,
            alt: `Test asset ${i}`,
            width: 1920,
            height: 1080
          })
        })
      );
    }

    const assetResponses = await Promise.all(assetPromises);
    for (const response of assetResponses) {
      const asset = await response.json();
      testAssetIds.push(asset.id);
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await fetch(`${API_BASE}/years/${testYearId}?force=true`, { method: 'DELETE' });
    for (const assetId of testAssetIds) {
      await fetch(`${API_BASE}/assets/${assetId}`, { method: 'DELETE' });
    }
  });

  test('POST /api/collections/{id}/assets - should add single asset to collection', async () => {
    const requestData = {
      asset_ids: [testAssetIds[0]]
    };

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(201);

    const collectionAssets = await response.json();
    expect(Array.isArray(collectionAssets)).toBe(true);
    expect(collectionAssets.length).toBe(1);
    expect(collectionAssets[0]).toMatchObject({
      collection_id: testCollectionId,
      asset_id: testAssetIds[0],
      order_index: expect.any(String)
    });
  });

  test('POST /api/collections/{id}/assets - should add multiple assets to collection', async () => {
    const requestData = {
      asset_ids: [testAssetIds[1], testAssetIds[2], testAssetIds[3]]
    };

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(201);

    const collectionAssets = await response.json();
    expect(Array.isArray(collectionAssets)).toBe(true);
    expect(collectionAssets.length).toBe(3);

    // Should maintain order of asset_ids in request
    expect(collectionAssets[0].asset_id).toBe(testAssetIds[1]);
    expect(collectionAssets[1].asset_id).toBe(testAssetIds[2]);
    expect(collectionAssets[2].asset_id).toBe(testAssetIds[3]);

    // Order indices should be in ascending order
    expect(collectionAssets[0].order_index <= collectionAssets[1].order_index).toBe(true);
    expect(collectionAssets[1].order_index <= collectionAssets[2].order_index).toBe(true);
  });

  test('POST /api/collections/{id}/assets - should insert assets at specific position', async () => {
    const requestData = {
      asset_ids: [testAssetIds[4]],
      insert_at: '1.5' // Insert between first and second asset
    };

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(201);

    const collectionAssets = await response.json();
    expect(collectionAssets[0].order_index).toBe('1.5');

    // Verify position in collection by getting full collection with assets
    const collectionResponse = await fetch(`${API_BASE}/collections/${testCollectionId}?include_assets=true`);
    const collection = await collectionResponse.json();
    
    // Find the inserted asset position
    const insertedAssetIndex = collection.assets.findIndex((a: any) => a.id === testAssetIds[4]);
    expect(insertedAssetIndex).toBeGreaterThan(0); // Should not be first
    expect(insertedAssetIndex).toBeLessThan(collection.assets.length - 1); // Should not be last
  });

  test('POST /api/collections/{id}/assets - should validate required asset_ids field', async () => {
    const requestData = {
      // missing asset_ids
      insert_at: '10.0'
    };

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('asset_ids')
    });
  });

  test('POST /api/collections/{id}/assets - should validate empty asset_ids array', async () => {
    const requestData = {
      asset_ids: [] // empty array
    };

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('asset_ids')
    });
  });

  test('POST /api/collections/{id}/assets - should return 404 for non-existent collection', async () => {
    const requestData = {
      asset_ids: [testAssetIds[0]]
    };

    const response = await fetch(`${API_BASE}/collections/non-existent-id/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('Collection not found')
    });
  });

  test('POST /api/collections/{id}/assets - should return 404 for non-existent assets', async () => {
    const requestData = {
      asset_ids: ['non-existent-asset-id']
    };

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('Asset not found')
    });
  });

  test('POST /api/collections/{id}/assets - should handle duplicate asset assignment gracefully', async () => {
    const requestData = {
      asset_ids: [testAssetIds[0]] // Already added in first test
    };

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    // Could be 409 (conflict) or 200 (idempotent) depending on implementation
    expect([200, 409]).toContain(response.status);
    
    if (response.status === 409) {
      expect(await response.json()).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('already exists')
      });
    }
  });

  test('POST /api/collections/{id}/assets - should require valid UUID format for collection_id', async () => {
    const requestData = {
      asset_ids: [testAssetIds[0]]
    };

    const response = await fetch(`${API_BASE}/collections/invalid-uuid/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('UUID')
    });
  });

  test('POST /api/collections/{id}/assets - should handle mixed valid and invalid asset IDs', async () => {
    const requestData = {
      asset_ids: [testAssetIds[1], 'non-existent-asset', testAssetIds[2]]
    };

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    // Should fail and not add any assets (all-or-nothing)
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('Asset not found')
    });
  });

  test('POST /api/collections/{id}/assets - should auto-generate order_index when insert_at not provided', async () => {
    // Create new collection for clean test
    const newCollectionResponse = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'auto-order-collection',
        title: 'Auto Order Collection',
        status: 'published'
      })
    });
    const newCollection = await newCollectionResponse.json();

    const requestData = {
      asset_ids: [testAssetIds[0], testAssetIds[1]]
      // No insert_at specified
    };

    const response = await fetch(`${API_BASE}/collections/${newCollection.id}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    expect(response.status).toBe(201);

    const collectionAssets = await response.json();
    expect(collectionAssets.length).toBe(2);
    expect(collectionAssets[0].order_index).toBeDefined();
    expect(collectionAssets[1].order_index).toBeDefined();
    expect(collectionAssets[0].order_index <= collectionAssets[1].order_index).toBe(true);
  });
});