import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';

describe('GET /publishing/collections/{id}/versions Contract Tests', () => {
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
        title: 'Test Collection for Versions',
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
        description: 'Test collection SEO description for versioning'
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

    // Create some version history by publishing multiple times
    await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        note: 'Initial publication'
      })
    });

    await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        note: 'Updated with new content'
      })
    });

    await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/unpublish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        note: 'Temporarily unpublished for review'
      })
    });

    await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        note: 'Re-published after review'
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

  test('GET /publishing/collections/{id}/versions - should return version history', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/versions`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(response.status).toBe(200);
    
    const versions = await response.json();
    expect(Array.isArray(versions)).toBe(true);
    expect(versions.length).toBeGreaterThan(0);

    // Verify VersionInfo schema
    const version = versions[0];
    expect(version).toMatchObject({
      version: expect.any(Number),
      note: expect.any(String),
      actor: expect.any(String),
      created_at: expect.any(String)
    });

    // Verify created_at is a valid ISO date
    expect(new Date(version.created_at).toISOString()).toBe(version.created_at);
  });

  test('GET /publishing/collections/{id}/versions - should return versions in descending order (newest first)', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/versions`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(response.status).toBe(200);
    
    const versions = await response.json();
    expect(versions.length).toBeGreaterThanOrEqual(2);

    // Should be sorted by created_at descending
    for (let i = 1; i < versions.length; i++) {
      const currentDate = new Date(versions[i - 1].created_at);
      const nextDate = new Date(versions[i].created_at);
      expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
    }
  });

  test('GET /publishing/collections/{id}/versions?limit=2 - should respect limit parameter', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/versions?limit=2`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(response.status).toBe(200);
    
    const versions = await response.json();
    expect(versions.length).toBe(2);
  });

  test('GET /publishing/collections/{id}/versions?limit=10 - should default to 10 when not specified', async () => {
    const responseWithoutLimit = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/versions`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    const responseWithLimit = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/versions?limit=10`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(responseWithoutLimit.status).toBe(200);
    expect(responseWithLimit.status).toBe(200);
    
    const versionsWithoutLimit = await responseWithoutLimit.json();
    const versionsWithLimit = await responseWithLimit.json();
    
    expect(versionsWithoutLimit.length).toBe(versionsWithLimit.length);
  });

  test('GET /publishing/collections/{id}/versions - should include both publish and unpublish actions', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/versions`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(response.status).toBe(200);
    
    const versions = await response.json();
    
    // Should find both publish and unpublish notes
    const notes = versions.map((v: any) => v.note);
    expect(notes).toContain('Temporarily unpublished for review');
    expect(notes).toContain('Re-published after review');
  });

  test('GET /publishing/collections/{id}/versions - should require authentication', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/versions`);
    
    expect(response.status).toBe(401);
  });

  test('GET /publishing/collections/{id}/versions - should return 404 for non-existent collection', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/non-existent-id/versions`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(response.status).toBe(404);
  });

  test('GET /publishing/collections/{id}/versions - should validate limit parameter', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/versions?limit=invalid`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('limit')
    });
  });

  test('GET /publishing/collections/{id}/versions - should enforce maximum limit', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/versions?limit=1000`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('limit')
    });
  });

  test('GET /publishing/collections/{id}/versions - should handle collection with no version history', async () => {
    // Create new collection without any publishing actions
    const newCollectionResponse = await fetch(`${API_BASE}/publishing/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        title: 'Collection without versions',
        year: 2024,
        status: 'draft'
      })
    });
    const newCollection = await newCollectionResponse.json();

    const response = await fetch(`${API_BASE}/publishing/collections/${newCollection.id}/versions`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(response.status).toBe(200);
    
    const versions = await response.json();
    expect(Array.isArray(versions)).toBe(true);
    expect(versions.length).toBe(0);

    // Cleanup
    await fetch(`${API_BASE}/publishing/collections/${newCollection.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer test-token' }
    });
  });
});