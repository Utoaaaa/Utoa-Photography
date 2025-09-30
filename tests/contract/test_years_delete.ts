import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';

describe('DELETE /api/years/{id} Contract Tests', () => {
  const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000/api';
  let testYearId: string;

  beforeAll(async () => {
    // Create a test year for deletion
    const response = await fetch(`${API_BASE}/years`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        label: 'Test Year for Deletion',
        status: 'draft'
      })
    });
    const year = await response.json();
    testYearId = year.id;
  });

  test('DELETE /api/years/{id} - should delete year successfully', async () => {
    const response = await fetch(`${API_BASE}/years/${testYearId}`, {
      method: 'DELETE'
    });

    expect(response.status).toBe(204);
  });

  test('DELETE /api/years/{id} - should return 404 for non-existent year', async () => {
    // Use a valid UUID format that is extremely unlikely to exist
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const response = await fetch(`${API_BASE}/years/${nonExistentId}`, {
      method: 'DELETE'
    });

    expect(response.status).toBe(404);
  });

  test('DELETE /api/years/{id} - should return 409 when year contains collections', async () => {
    // Create year with collection
    const yearResponse = await fetch(`${API_BASE}/years`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        label: 'Year with Collections',
        status: 'draft'
      })
    });
    const year = await yearResponse.json();

    // Add collection to year
    await fetch(`${API_BASE}/years/${year.id}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'test-collection',
        title: 'Test Collection',
        status: 'draft'
      })
    });

    // Try to delete year
    const deleteResponse = await fetch(`${API_BASE}/years/${year.id}`, {
      method: 'DELETE'
    });

    expect(deleteResponse.status).toBe(409);
    expect(await deleteResponse.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('collections')
    });
  });

  test('DELETE /api/years/{id} - should force delete year with collections when force=true', async () => {
    // Create year with collection
    const yearResponse = await fetch(`${API_BASE}/years`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        label: 'Year for Force Delete',
        status: 'draft'
      })
    });
    const year = await yearResponse.json();

    // Add collection to year
    await fetch(`${API_BASE}/years/${year.id}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'force-delete-collection',
        title: 'Force Delete Collection',
        status: 'draft'
      })
    });

    // Force delete year
    const deleteResponse = await fetch(`${API_BASE}/years/${year.id}?force=true`, {
      method: 'DELETE'
    });

    expect(deleteResponse.status).toBe(204);
  });

  test('DELETE /api/years/{id} - should require valid UUID format', async () => {
    const response = await fetch(`${API_BASE}/years/invalid-uuid`, {
      method: 'DELETE'
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('UUID')
    });
  });
});