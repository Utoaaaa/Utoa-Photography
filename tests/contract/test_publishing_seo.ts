import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';

describe('PUT /publishing/collections/{id}/seo Contract Tests', () => {
  const API_BASE = process.env.TEST_PUBLISHING_API_BASE || 'http://localhost:3001';
  let testCollectionId: string;

  beforeAll(async () => {
    // Create test collection
    const collectionResponse = await fetch(`${API_BASE}/publishing/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        title: 'Test Collection for SEO',
        year: 2024,
        status: 'draft'
      })
    });
    const collection = await collectionResponse.json();
    testCollectionId = collection.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await fetch(`${API_BASE}/publishing/collections/${testCollectionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer test-token' }
    });
  });

  test('PUT /publishing/collections/{id}/seo - should set SEO title and description', async () => {
    const seoData = {
      title: 'SEO Optimized Collection Title',
      description: 'This is a comprehensive description for SEO purposes, providing context about the photography collection and its artistic vision.'
    };

    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/seo`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(seoData)
    });
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result).toMatchObject({
      success: true,
      seo: {
        title: 'SEO Optimized Collection Title',
        description: 'This is a comprehensive description for SEO purposes, providing context about the photography collection and its artistic vision.',
        ogImageAssetId: null
      }
    });
  });

  test('PUT /publishing/collections/{id}/seo - should set SEO with OG image asset ID', async () => {
    const seoData = {
      title: 'Collection with OG Image',
      description: 'Collection that includes a specific Open Graph image for social media sharing.',
      ogImageAssetId: 'test-og-image-asset-id'
    };

    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/seo`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(seoData)
    });
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result).toMatchObject({
      success: true,
      seo: {
        title: 'Collection with OG Image',
        description: 'Collection that includes a specific Open Graph image for social media sharing.',
        ogImageAssetId: 'test-og-image-asset-id'
      }
    });
  });

  test('PUT /publishing/collections/{id}/seo - should be idempotent (can overwrite existing SEO)', async () => {
    // First SEO update
    await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/seo`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        title: 'First SEO Title',
        description: 'First SEO description'
      })
    });

    // Second SEO update (should overwrite)
    const secondSeoData = {
      title: 'Updated SEO Title',
      description: 'This is the updated SEO description that should replace the previous one.',
      ogImageAssetId: 'new-og-image-id'
    };

    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/seo`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(secondSeoData)
    });
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result.seo).toMatchObject({
      title: 'Updated SEO Title',
      description: 'This is the updated SEO description that should replace the previous one.',
      ogImageAssetId: 'new-og-image-id'
    });
  });

  test('PUT /publishing/collections/{id}/seo - should require authentication', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/seo`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Should not work',
        description: 'This should fail'
      })
    });
    
    expect(response.status).toBe(401);
  });

  test('PUT /publishing/collections/{id}/seo - should return 404 for non-existent collection', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/non-existent-id/seo`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        title: 'Should not work',
        description: 'This should fail'
      })
    });
    
    expect(response.status).toBe(404);
  });

  test('PUT /publishing/collections/{id}/seo - should require title field', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/seo`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        description: 'Missing title field'
      })
    });
    
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('title')
    });
  });

  test('PUT /publishing/collections/{id}/seo - should require description field', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/seo`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        title: 'Missing description field'
      })
    });
    
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('description')
    });
  });

  test('PUT /publishing/collections/{id}/seo - should validate non-empty title', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/seo`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        title: '',
        description: 'Valid description but empty title'
      })
    });
    
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('title')
    });
  });

  test('PUT /publishing/collections/{id}/seo - should validate non-empty description', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/seo`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        title: 'Valid title',
        description: ''
      })
    });
    
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('description')
    });
  });

  test('PUT /publishing/collections/{id}/seo - should allow null ogImageAssetId', async () => {
    const seoData = {
      title: 'Collection without OG image',
      description: 'This collection does not specify an Open Graph image.',
      ogImageAssetId: null
    };

    const response = await fetch(`${API_BASE}/publishing/collections/${testCollectionId}/seo`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(seoData)
    });
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result.seo.ogImageAssetId).toBeNull();
  });
});