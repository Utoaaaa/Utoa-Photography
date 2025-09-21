import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';

describe('POST /publishing/collections/{id}/publish and /unpublish Contract Tests', () => {
  const API_BASE = process.env.TEST_PUBLISHING_API_BASE || 'http://localhost:3001';
  let testCollectionId: string;

  beforeAll(async () => {
    // Create test collection with required SEO and assets
    const collectionResponse = await fetch(`${API_BASE}/publishing/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        title: 'Test Collection for Publishing',
        year: 2024,
        status: 'draft'
      })
    });
    const collection = await collectionResponse.json();
    testCollectionId = collection.id;

    // Set required SEO data
    await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/seo`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        title: 'Test Collection SEO Title',
        description: 'Test collection SEO description for publishing'
      })
    });

    // Add test asset with alt text (required for publishing)
    await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        image_id: 'test-image-1',
        alt: 'Test image alt text',
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

  test('POST /publishing/collections/{id}/publish - should publish collection and increment version', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        note: 'First publication of the test collection'
      })
    });
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result).toMatchObject({
      success: true,
      collection: {
        id: testCollectionId,
        status: 'published',
        version: 1,
        published_at: expect.any(String),
        publish_note: 'First publication of the test collection'
      }
    });

    // Verify published_at is a valid ISO date
    expect(new Date(result.collection.published_at).toISOString()).toBe(result.collection.published_at);
  });

  test('POST /publishing/collections/{id}/publish - should increment version on subsequent publishes', async () => {
    // Publish again
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        note: 'Second publication with updates'
      })
    });
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result.collection).toMatchObject({
      id: testCollectionId,
      status: 'published',
      version: 2,
      publish_note: 'Second publication with updates'
    });
  });

  test('POST /publishing/collections/{id}/unpublish - should unpublish collection without incrementing version', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/unpublish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        note: 'Unpublishing for maintenance'
      })
    });
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result).toMatchObject({
      success: true,
      collection: {
        id: testCollectionId,
        status: 'draft',
        version: 2, // Should remain the same
        publish_note: 'Unpublishing for maintenance'
      }
    });

    // published_at should be cleared
    expect(result.collection.published_at).toBeNull();
  });

  test('POST /publishing/collections/{id}/publish - should trigger cache invalidation', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        note: 'Testing cache invalidation'
      })
    });
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result).toMatchObject({
      success: true,
      cacheInvalidation: {
        triggered: true,
        targets: expect.arrayContaining(['home', 'year', 'collection'])
      }
    });
  });

  test('POST /publishing/collections/{id}/unpublish - should trigger cache invalidation', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/unpublish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        note: 'Testing unpublish cache invalidation'
      })
    });
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result).toMatchObject({
      success: true,
      cacheInvalidation: {
        triggered: true,
        targets: expect.arrayContaining(['home', 'year', 'collection'])
      }
    });
  });

  test('POST /publishing/collections/{id}/publish - should require authentication', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        note: 'Should not work'
      })
    });
    
    expect(response.status).toBe(401);
  });

  test('POST /publishing/collections/{id}/publish - should return 404 for non-existent collection', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/non-existent-id/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        note: 'Should not work'
      })
    });
    
    expect(response.status).toBe(404);
  });

  test('POST /publishing/collections/{id}/publish - should require note field', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({})
    });
    
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('note')
    });
  });

  test('POST /publishing/collections/{id}/publish - should require non-empty note', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        note: ''
      })
    });
    
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('note')
    });
  });

  test('POST /publishing/collections/{id}/publish - should fail if checklist requirements not met', async () => {
    // Create collection without required SEO or alt texts
    const incompleteCollectionResponse = await fetch(`${API_BASE}/publishing/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        title: 'Incomplete Collection',
        year: 2024,
        status: 'draft'
      })
    });
    const incompleteCollection = await incompleteCollectionResponse.json();

    const response = await fetch(`${API_BASE}/publishing/collections/${incompleteCollection.id}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        note: 'Should fail checklist validation'
      })
    });
    
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('checklist'),
      missingRequirements: expect.any(Array)
    });

    // Cleanup
    await fetch(`${API_BASE}/publishing/collections/${incompleteCollection.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer test-token' }
    });
  });
});