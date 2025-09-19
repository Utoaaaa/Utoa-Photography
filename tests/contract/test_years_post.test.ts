/**
 * Contract Test: POST /api/years
 * 
 * Tests the API contract for creating new years according to OpenAPI spec.
 * This test MUST FAIL until the API endpoint is implemented.
 */

describe('Contract: POST /api/years', () => {
  const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

  const validYearData = {
    label: '2025',
    order_index: '2025.0',
    status: 'draft' as const,
  };

  const mockAuthHeader = {
    'Authorization': 'Bearer mock_cloudflare_access_token',
    'Content-Type': 'application/json',
  };

  it('should create new year with valid data and return 201', async () => {
    const response = await fetch(`${BASE_URL}/api/years`, {
      method: 'POST',
      headers: mockAuthHeader,
      body: JSON.stringify(validYearData),
    });

    expect(response.status).toBe(201);
    expect(response.headers.get('content-type')).toContain('application/json');

    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.label).toBe(validYearData.label);
    expect(data.order_index).toBe(validYearData.order_index);
    expect(data.status).toBe(validYearData.status);
    expect(data).toHaveProperty('created_at');
    expect(data).toHaveProperty('updated_at');

    // Validate UUID format
    expect(data.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('should create year with minimal required data (label only)', async () => {
    const minimalData = { label: '2026' };

    const response = await fetch(`${BASE_URL}/api/years`, {
      method: 'POST',
      headers: mockAuthHeader,
      body: JSON.stringify(minimalData),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.label).toBe('2026');
    expect(data.status).toBe('draft'); // default status
    expect(data).toHaveProperty('order_index');
  });

  it('should auto-generate order_index if not provided', async () => {
    const dataWithoutIndex = { label: '2027', status: 'draft' };

    const response = await fetch(`${BASE_URL}/api/years`, {
      method: 'POST',
      headers: mockAuthHeader,
      body: JSON.stringify(dataWithoutIndex),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('order_index');
    expect(typeof data.order_index).toBe('string');
  });

  it('should return 400 for missing required label field', async () => {
    const invalidData = { status: 'draft' };

    const response = await fetch(`${BASE_URL}/api/years`, {
      method: 'POST',
      headers: mockAuthHeader,
      body: JSON.stringify(invalidData),
    });

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/json');

    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error).toHaveProperty('message');
    expect(error.message).toContain('label');
  });

  it('should return 400 for invalid status value', async () => {
    const invalidData = {
      label: '2028',
      status: 'invalid_status',
    };

    const response = await fetch(`${BASE_URL}/api/years`, {
      method: 'POST',
      headers: mockAuthHeader,
      body: JSON.stringify(invalidData),
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.message).toContain('status');
  });

  it('should return 400 for invalid JSON body', async () => {
    const response = await fetch(`${BASE_URL}/api/years`, {
      method: 'POST',
      headers: mockAuthHeader,
      body: 'invalid json',
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error).toHaveProperty('error');
  });

  it('should return 401 without authentication header', async () => {
    const response = await fetch(`${BASE_URL}/api/years`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validYearData),
    });

    expect(response.status).toBe(401);
  });

  it('should return 401 with invalid authentication token', async () => {
    const invalidAuthHeader = {
      'Authorization': 'Bearer invalid_token',
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${BASE_URL}/api/years`, {
      method: 'POST',
      headers: invalidAuthHeader,
      body: JSON.stringify(validYearData),
    });

    expect(response.status).toBe(401);
  });

  it('should handle duplicate label gracefully', async () => {
    // First creation
    await fetch(`${BASE_URL}/api/years`, {
      method: 'POST',
      headers: mockAuthHeader,
      body: JSON.stringify({ label: 'DuplicateTest' }),
    });

    // Second creation with same label
    const response = await fetch(`${BASE_URL}/api/years`, {
      method: 'POST',
      headers: mockAuthHeader,
      body: JSON.stringify({ label: 'DuplicateTest' }),
    });

    // Should either succeed (labels can be duplicate) or return 409 conflict
    expect([201, 409]).toContain(response.status);
  });

  it('should validate label format and length', async () => {
    const testCases = [
      { label: '', expectedStatus: 400 }, // empty
      { label: 'a'.repeat(201), expectedStatus: 400 }, // too long
      { label: '2024', expectedStatus: 201 }, // valid
      { label: '2024 春季', expectedStatus: 201 }, // valid with spaces
    ];

    for (const testCase of testCases) {
      const response = await fetch(`${BASE_URL}/api/years`, {
        method: 'POST',
        headers: mockAuthHeader,
        body: JSON.stringify({ label: testCase.label }),
      });

      expect(response.status).toBe(testCase.expectedStatus);
    }
  });
});