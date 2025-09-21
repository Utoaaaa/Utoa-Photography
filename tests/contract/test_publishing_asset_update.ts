import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';

describe('PATCH /publishing/collections/{id}/assets/{assetId} Contract Tests', () => {
  const API_BASE = process.env.TEST_PUBLISHING_API_BASE || 'http://localhost:3001';
  let testCollectionId: string;
  let testAssetId: string;

  beforeAll(async () => {
    // Create test collection
    const collectionResponse = await fetch(`${API_BASE}/publishing/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        title: 'Test Collection for Asset Update',
        year: 2024,
        status: 'draft'
      })
    });
    const collection = await collectionResponse.json();
    testCollectionId = collection.id;

    // Create test asset
    const assetResponse = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        image_id: 'test-image-id',
        alt: 'Original alt text',
        text: 'Original slide text',
        slide_index: 0
      })
    });
    const asset = await assetResponse.json();
    testAssetId = asset.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await fetch(`${API_BASE}/publishing/collections/${testCollectionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer test-token' }
    });
  });

  test('PATCH /publishing/collections/{id}/assets/{assetId} - should update asset text field', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/assets/${testAssetId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        text: 'Updated slide text content'
      })
    });
    
    expect(response.status).toBe(200);
    
    const updatedAsset = await response.json();
    expect(updatedAsset).toMatchObject({
      id: testAssetId,
      text: 'Updated slide text content',
      alt: 'Original alt text', // Should remain unchanged
      slide_index: 0 // Should remain unchanged
    });
  });

  test('PATCH /publishing/collections/{id}/assets/{assetId} - should update alt field', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/assets/${testAssetId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        alt: 'Updated alt text for accessibility'
      })
    });
    
    expect(response.status).toBe(200);
    
    const updatedAsset = await response.json();
    expect(updatedAsset).toMatchObject({
      id: testAssetId,
      alt: 'Updated alt text for accessibility'
    });
  });

  test('PATCH /publishing/collections/{id}/assets/{assetId} - should update slide_index', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/assets/${testAssetId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        slide_index: 5
      })
    });
    
    expect(response.status).toBe(200);
    
    const updatedAsset = await response.json();
    expect(updatedAsset).toMatchObject({
      id: testAssetId,
      slide_index: 5
    });
  });

  test('PATCH /publishing/collections/{id}/assets/{assetId} - should update multiple fields', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/assets/${testAssetId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        text: 'Final updated text',
        alt: 'Final updated alt text',
        slide_index: 10
      })
    });
    
    expect(response.status).toBe(200);
    
    const updatedAsset = await response.json();
    expect(updatedAsset).toMatchObject({
      id: testAssetId,
      text: 'Final updated text',
      alt: 'Final updated alt text',
      slide_index: 10
    });
  });

  test('PATCH /publishing/collections/{id}/assets/{assetId} - should allow null text', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/assets/${testAssetId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        text: null
      })
    });
    
    expect(response.status).toBe(200);
    
    const updatedAsset = await response.json();
    expect(updatedAsset.text).toBeNull();
  });

  test('PATCH /publishing/collections/{id}/assets/{assetId} - should require authentication', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/assets/${testAssetId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'Should not work'
      })
    });
    
    expect(response.status).toBe(401);
  });

  test('PATCH /publishing/collections/{id}/assets/{assetId} - should return 404 for non-existent collection', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/non-existent-id/assets/${testAssetId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        text: 'Should not work'
      })
    });
    
    expect(response.status).toBe(404);
  });

  test('PATCH /publishing/collections/{id}/assets/{assetId} - should return 404 for non-existent asset', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/assets/non-existent-asset`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        text: 'Should not work'
      })
    });
    
    expect(response.status).toBe(404);
  });

  test('PATCH /publishing/collections/{id}/assets/{assetId} - should validate slide_index is non-negative', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/assets/${testAssetId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        slide_index: -1
      })
    });
    
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('slide_index')
    });
  });

  test('PATCH /publishing/collections/{id}/assets/{assetId} - should require non-empty alt text', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/assets/${testAssetId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        alt: ''
      })
    });
    
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('alt')
    });
  });
});