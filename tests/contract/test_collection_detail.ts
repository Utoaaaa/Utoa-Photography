import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';

describe('GET /api/collections/{id} Contract Tests', () => {
  const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000/api';
  let testYearId: string;
  let testCollectionId: string;
  let testAssetId: string;

  beforeAll(async () => {
    // Create test year
    const yearResponse = await fetch(`${API_BASE}/years`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        label: 'Test Year for Collection Detail',
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
        slug: 'test-collection-detail',
        title: 'Test Collection Detail',
        summary: 'A test collection for detail endpoint testing',
        status: 'published'
      })
    });
    const collection = await collectionResponse.json();
    testCollectionId = collection.id;

    // Create test asset
    const assetResponse = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'test-asset-detail',
        alt: 'Test asset for collection detail',
        width: 1920,
        height: 1080
      })
    });
    const asset = await assetResponse.json();
    testAssetId = asset.id;

    // Add asset to collection
    await fetch(`${API_BASE}/collections/${testCollectionId}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        asset_ids: [testAssetId]
      })
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await fetch(`${API_BASE}/years/${testYearId}?force=true`, { method: 'DELETE' });
  });

  test('GET /api/collections/{id} - should return collection without assets by default', async () => {
    const response = await fetch(`${API_BASE}/collections/${testCollectionId}`);

    expect(response.status).toBe(200);

    const collection = await response.json();
    expect(collection).toMatchObject({
      id: testCollectionId,
      year_id: testYearId,
      slug: 'test-collection-detail',
      title: 'Test Collection Detail',
      summary: 'A test collection for detail endpoint testing',
      status: 'published',
      order_index: expect.any(String),
      created_at: expect.any(String),
      updated_at: expect.any(String)
    });

    // Should not include assets by default
    expect(collection.assets).toBeUndefined();
  });

  test('GET /api/collections/{id}?include_assets=true - should return collection with assets', async () => {
    const response = await fetch(`${API_BASE}/collections/${testCollectionId}?include_assets=true`);

    expect(response.status).toBe(200);

    const collection = await response.json();
    expect(collection).toMatchObject({
      id: testCollectionId,
      year_id: testYearId,
      slug: 'test-collection-detail',
      title: 'Test Collection Detail',
      summary: 'A test collection for detail endpoint testing',
      status: 'published'
    });

    // Should include assets array
    expect(collection.assets).toBeDefined();
    expect(Array.isArray(collection.assets)).toBe(true);
    expect(collection.assets.length).toBe(1);
    
    expect(collection.assets[0]).toMatchObject({
      id: testAssetId,
      alt: 'Test asset for collection detail',
      width: 1920,
      height: 1080,
      order_index: expect.any(String)
    });
  });

  test('GET /api/collections/{id}?include_assets=false - should return collection without assets', async () => {
    const response = await fetch(`${API_BASE}/collections/${testCollectionId}?include_assets=false`);

    expect(response.status).toBe(200);

    const collection = await response.json();
    expect(collection.assets).toBeUndefined();
  });

  test('GET /api/collections/{id} - should return 404 for non-existent collection', async () => {
    const response = await fetch(`${API_BASE}/collections/non-existent-id`);

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('Collection not found')
    });
  });

  test('GET /api/collections/{id} - should require valid UUID format', async () => {
    const response = await fetch(`${API_BASE}/collections/invalid-uuid`);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('UUID')
    });
  });

  test('GET /api/collections/{id} - should return collection with cover asset reference', async () => {
    // Update collection to have cover asset
    await fetch(`${API_BASE}/collections/${testCollectionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cover_asset_id: testAssetId
      })
    });

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}`);

    expect(response.status).toBe(200);

    const collection = await response.json();
    expect(collection.cover_asset_id).toBe(testAssetId);
  });

  test('GET /api/collections/{id} - should handle empty collection (no assets)', async () => {
    // Create collection without assets
    const emptyCollectionResponse = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'empty-collection',
        title: 'Empty Collection',
        status: 'published'
      })
    });
    const emptyCollection = await emptyCollectionResponse.json();

    const response = await fetch(`${API_BASE}/collections/${emptyCollection.id}?include_assets=true`);

    expect(response.status).toBe(200);

    const collection = await response.json();
    expect(collection.assets).toBeDefined();
    expect(Array.isArray(collection.assets)).toBe(true);
    expect(collection.assets.length).toBe(0);
  });

  test('GET /api/collections/{id} - should return assets in correct order', async () => {
    // Create multiple assets and add them to collection
    const asset2Response = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'test-asset-2',
        alt: 'Second test asset',
        width: 1280,
        height: 720
      })
    });

    // Add second asset to collection
    await fetch(`${API_BASE}/collections/${testCollectionId}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        asset_ids: ['test-asset-2']
      })
    });

    const response = await fetch(`${API_BASE}/collections/${testCollectionId}?include_assets=true`);

    expect(response.status).toBe(200);

    const collection = await response.json();
    expect(collection.assets.length).toBe(2);
    
    // Assets should be ordered by order_index
    expect(collection.assets[0].order_index <= collection.assets[1].order_index).toBe(true);
  });
});