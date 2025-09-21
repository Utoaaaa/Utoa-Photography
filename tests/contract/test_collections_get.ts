import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';

describe('GET /publishing/collections Contract Tests (Private Publishing API)', () => {
  const API_BASE = process.env.TEST_PUBLISHING_API_BASE || 'http://localhost:3001';
  let testCollectionId: string;
  let publishedCollectionId: string;
  
  beforeAll(async () => {
    // Create test collections for publishing API
    const draftResponse = await fetch(`${API_BASE}/publishing/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        title: 'Draft Collection for Testing',
        year: 2024,
        status: 'draft'
      })
    });
    const draftCollection = await draftResponse.json();
    testCollectionId = draftCollection.id;

    const publishedResponse = await fetch(`${API_BASE}/publishing/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        title: 'Published Collection for Testing',
        year: 2024,
        status: 'published'
      })
    });
    const publishedCollection = await publishedResponse.json();
    publishedCollectionId = publishedCollection.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await Promise.all([
      fetch(`${API_BASE}/publishing/collections/${testCollectionId}`, { 
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token' }
      }),
      fetch(`${API_BASE}/publishing/collections/${publishedCollectionId}`, { 
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token' }
      })
    ]);
  });

  test('GET /publishing/collections - should return collection summaries with checklist status', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(response.status).toBe(200);
    
    const collections = await response.json();
    expect(Array.isArray(collections)).toBe(true);
    expect(collections.length).toBeGreaterThanOrEqual(2);
    
    // Verify CollectionSummary schema
    const summary = collections[0];
    expect(summary).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      year: expect.any(Number),
      draftCount: expect.any(Number),
      checklistStatus: expect.stringMatching(/^(pass|pending)$/)
    });
  });

  test('GET /publishing/collections?year=2024 - should filter by year', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections?year=2024`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(response.status).toBe(200);
    
    const collections = await response.json();
    expect(Array.isArray(collections)).toBe(true);
    collections.forEach((collection: any) => {
      expect(collection.year).toBe(2024);
    });
  });

  test('GET /publishing/collections?status=draft - should filter by status', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections?status=draft`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(response.status).toBe(200);
    
    const collections = await response.json();
    expect(Array.isArray(collections)).toBe(true);
    
    // Should include our draft collection
    const draftCollection = collections.find((c: any) => c.id === testCollectionId);
    expect(draftCollection).toBeDefined();
  });

  test('GET /publishing/collections?status=published - should filter by published status', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections?status=published`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(response.status).toBe(200);
    
    const collections = await response.json();
    expect(Array.isArray(collections)).toBe(true);
    
    // Should include our published collection
    const publishedCollection = collections.find((c: any) => c.id === publishedCollectionId);
    expect(publishedCollection).toBeDefined();
  });

  test('GET /publishing/collections - should require authentication', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections`);
    
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('authentication')
    });
  });

  test('GET /publishing/collections?year=invalid - should validate year parameter', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections?year=invalid`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('year')
    });
  });

  test('GET /publishing/collections?status=invalid - should validate status parameter', async () => {
    const response = await fetch(`${API_BASE}/publishing/collections?status=invalid`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('status')
    });
  });
});

// Keep original public API tests as well
describe('GET /api/years/{year_id}/collections Contract Tests (Public API)', () => {
  const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000/api';
  let testYearId: string;
  let publishedCollectionId: string;
  let draftCollectionId: string;

  beforeAll(async () => {
    // Create test year
    const yearResponse = await fetch(`${API_BASE}/years`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        label: 'Test Year for Collections',
        status: 'published'
      })
    });
    const year = await yearResponse.json();
    testYearId = year.id;

    // Create published collection
    const publishedResponse = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'published-collection',
        title: 'Published Collection',
        summary: 'A published test collection',
        status: 'published',
        order_index: '1.0'
      })
    });
    const publishedCollection = await publishedResponse.json();
    publishedCollectionId = publishedCollection.id;

    // Create draft collection
    const draftResponse = await fetch(`${API_BASE}/years/${testYearId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'draft-collection',
        title: 'Draft Collection',
        summary: 'A draft test collection',
        status: 'draft',
        order_index: '2.0'
      })
    });
    const draftCollection = await draftResponse.json();
    draftCollectionId = draftCollection.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await fetch(`${API_BASE}/years/${testYearId}?force=true`, { method: 'DELETE' });
  });

  test('GET /api/years/{year_id}/collections - should return all collections by default', async () => {
    const response = await fetch(`${API_BASE}/years/${testYearId}/collections`);
    
    expect(response.status).toBe(200);
    
    const collections = await response.json();
    expect(Array.isArray(collections)).toBe(true);
    expect(collections.length).toBe(2);
    
    // Should be ordered by order_index
    expect(collections[0].title).toBe('Published Collection');
    expect(collections[1].title).toBe('Draft Collection');
  });

  test('GET /api/years/{year_id}/collections?status=published - should return only published collections', async () => {
    const response = await fetch(`${API_BASE}/years/${testYearId}/collections?status=published`);
    
    expect(response.status).toBe(200);
    
    const collections = await response.json();
    expect(Array.isArray(collections)).toBe(true);
    expect(collections.length).toBe(1);
    expect(collections[0]).toMatchObject({
      id: publishedCollectionId,
      year_id: testYearId,
      slug: 'published-collection',
      title: 'Published Collection',
      summary: 'A published test collection',
      status: 'published',
      order_index: '1.0'
    });
  });

  test('GET /api/years/{year_id}/collections?status=draft - should return only draft collections', async () => {
    const response = await fetch(`${API_BASE}/years/${testYearId}/collections?status=draft`);
    
    expect(response.status).toBe(200);
    
    const collections = await response.json();
    expect(Array.isArray(collections)).toBe(true);
    expect(collections.length).toBe(1);
    expect(collections[0]).toMatchObject({
      id: draftCollectionId,
      status: 'draft'
    });
  });

  test('GET /api/years/{year_id}/collections?status=all - should return all collections', async () => {
    const response = await fetch(`${API_BASE}/years/${testYearId}/collections?status=all`);
    
    expect(response.status).toBe(200);
    
    const collections = await response.json();
    expect(Array.isArray(collections)).toBe(true);
    expect(collections.length).toBe(2);
  });

  test('GET /api/years/{year_id}/collections - should return 404 for non-existent year', async () => {
    const response = await fetch(`${API_BASE}/years/non-existent-id/collections`);
    
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('Year not found')
    });
  });

  test('GET /api/years/{year_id}/collections - should return empty array for year with no collections', async () => {
    // Create year without collections
    const yearResponse = await fetch(`${API_BASE}/years`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        label: 'Empty Year',
        status: 'published'
      })
    });
    const emptyYear = await yearResponse.json();

    const response = await fetch(`${API_BASE}/years/${emptyYear.id}/collections`);
    
    expect(response.status).toBe(200);
    
    const collections = await response.json();
    expect(Array.isArray(collections)).toBe(true);
    expect(collections.length).toBe(0);

    // Cleanup
    await fetch(`${API_BASE}/years/${emptyYear.id}`, { method: 'DELETE' });
  });

  test('GET /api/years/{year_id}/collections - should validate status parameter', async () => {
    const response = await fetch(`${API_BASE}/years/${testYearId}/collections?status=invalid`);
    
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('status')
    });
  });

  test('GET /api/years/{year_id}/collections - should require valid UUID format for year_id', async () => {
    const response = await fetch(`${API_BASE}/years/invalid-uuid/collections`);
    
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('UUID')
    });
  });
});