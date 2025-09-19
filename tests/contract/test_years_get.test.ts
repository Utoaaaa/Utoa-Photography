/**
 * Contract Test: GET /api/years
 * 
 * Tests the API contract for retrieving years list according to OpenAPI spec.
 * This test MUST FAIL until the API endpoint is implemented.
 */

import { NextRequest } from 'next/server';

describe('Contract: GET /api/years', () => {
  const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

  beforeEach(() => {
    // Reset any test state
  });

  afterEach(() => {
    // Cleanup
  });

  it('should return 200 with years array when no query params', async () => {
    const response = await fetch(`${BASE_URL}/api/years`);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    
    // Each year should match the schema
    if (data.length > 0) {
      const year = data[0];
      expect(year).toHaveProperty('id');
      expect(year).toHaveProperty('label');
      expect(year).toHaveProperty('order_index');
      expect(year).toHaveProperty('status');
      expect(year).toHaveProperty('created_at');
      expect(year).toHaveProperty('updated_at');
      
      expect(typeof year.id).toBe('string');
      expect(typeof year.label).toBe('string');
      expect(typeof year.order_index).toBe('string');
      expect(['draft', 'published']).toContain(year.status);
    }
  });

  it('should filter by status when status query param provided', async () => {
    const response = await fetch(`${BASE_URL}/api/years?status=published`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    
    // All returned years should have status=published
    data.forEach(year => {
      expect(year.status).toBe('published');
    });
  });

  it('should order by desc by default', async () => {
    const response = await fetch(`${BASE_URL}/api/years`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    if (data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        // order_index should be in descending order (newer years first)
        expect(data[i-1].order_index >= data[i].order_index).toBe(true);
      }
    }
  });

  it('should order by asc when order=asc', async () => {
    const response = await fetch(`${BASE_URL}/api/years?order=asc`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    if (data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        // order_index should be in ascending order (older years first)
        expect(data[i-1].order_index <= data[i].order_index).toBe(true);
      }
    }
  });

  it('should return 400 for invalid status query param', async () => {
    const response = await fetch(`${BASE_URL}/api/years?status=invalid`);
    
    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/json');
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error).toHaveProperty('message');
  });

  it('should return 400 for invalid order query param', async () => {
    const response = await fetch(`${BASE_URL}/api/years?order=invalid`);
    
    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error).toHaveProperty('message');
  });

  it('should handle both status and order params together', async () => {
    const response = await fetch(`${BASE_URL}/api/years?status=published&order=asc`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    
    // Should be filtered by status AND ordered
    data.forEach(year => {
      expect(year.status).toBe('published');
    });
    
    if (data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        expect(data[i-1].order_index <= data[i].order_index).toBe(true);
      }
    }
  });
});