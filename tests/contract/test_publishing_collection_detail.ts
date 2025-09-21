import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';

describe('GET /publishing/collections/{id} Contract Tests (Publishing API)', () => {
  const API_BASE = process.env.TEST_PUBLISHING_API_BASE || 'http://localhost:3001';
  let testCollectionId: string;

  beforeAll(async () => {
    // Create test collection with assets
    const collectionResponse = await fetch(`${API_BASE}/publishing/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        title: 'Test Collection for Detail',
        year: 2024,
        status: 'draft'
      })
    });
    const collection = await collectionResponse.json();
    testCollectionId = collection.id;

    // Add test asset
    await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        image_id: 'test-image-id',
        alt: 'Test image description',
        text: 'Test slide text',
        slide_index: 0
      })
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await fetch(`${API_BASE}/publishing/collections/${testCollectionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer test-token' }
    });
  });

  test('GET /publishing/collections/{id} - should return collection detail with slides and SEO', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(response.status).toBe(200);
    
    const collection = await response.json();
    
    // Verify CollectionDetail schema
    expect(collection).toMatchObject({
      id: testCollectionId,
      title: expect.any(String),
      slides: expect.any(Array)
    });

    // Verify slide structure
    if (collection.slides.length > 0) {
      const slide = collection.slides[0];
      expect(slide).toMatchObject({
        assetId: expect.any(String),
        url: expect.any(String),
        alt: expect.any(String),
        slide_index: expect.any(Number)
      });
      
      // text can be null
      expect(slide).toHaveProperty('text');
    }

    // Verify SEO structure (can be undefined)
    if (collection.seo) {
      expect(collection.seo).toMatchObject({
        title: expect.any(String),
        description: expect.any(String)
      });
      // ogImageAssetId can be null
      expect(collection.seo).toHaveProperty('ogImageAssetId');
    }
  });

  test('GET /publishing/collections/{id} - should require authentication', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}`);
    
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('authentication')
    });
  });

  test('GET /publishing/collections/{id} - should return 404 for non-existent collection', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/non-existent-id`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('Collection not found')
    });
  });

  test('GET /publishing/collections/{id} - should validate collection ID format', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/invalid-uuid`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('UUID')
    });
  });
});