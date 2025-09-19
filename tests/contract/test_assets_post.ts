import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';

describe('POST /api/assets Contract Tests', () => {
  const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000/api';
  let testAssetIds: string[] = [];

  afterAll(async () => {
    // Cleanup test assets
    for (const assetId of testAssetIds) {
      await fetch(`${API_BASE}/assets/${assetId}`, { method: 'DELETE' });
    }
  });

  test('POST /api/assets - should create asset with required fields', async () => {
    const assetData = {
      id: 'test-asset-minimal',
      alt: 'Minimal test asset',
      width: 1920,
      height: 1080
    };

    const response = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assetData)
    });

    expect(response.status).toBe(201);

    const asset = await response.json();
    expect(asset).toMatchObject({
      id: 'test-asset-minimal',
      alt: 'Minimal test asset',
      width: 1920,
      height: 1080,
      created_at: expect.any(String)
    });

    testAssetIds.push(asset.id);
  });

  test('POST /api/assets - should create asset with all fields', async () => {
    const assetData = {
      id: 'test-asset-full',
      alt: 'Complete test asset with all fields',
      caption: 'This is a test asset with caption and metadata',
      width: 2560,
      height: 1440,
      metadata_json: {
        camera: 'Canon EOS R5',
        lens: '24-70mm f/2.8',
        focal_length: '50mm',
        aperture: 'f/4.0',
        shutter_speed: '1/125s',
        iso: 400,
        date_taken: '2024-03-15T10:30:00Z'
      }
    };

    const response = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assetData)
    });

    expect(response.status).toBe(201);

    const asset = await response.json();
    expect(asset).toMatchObject({
      id: 'test-asset-full',
      alt: 'Complete test asset with all fields',
      caption: 'This is a test asset with caption and metadata',
      width: 2560,
      height: 1440,
      metadata_json: {
        camera: 'Canon EOS R5',
        lens: '24-70mm f/2.8',
        focal_length: '50mm',
        aperture: 'f/4.0',
        shutter_speed: '1/125s',
        iso: 400,
        date_taken: '2024-03-15T10:30:00Z'
      },
      created_at: expect.any(String)
    });

    testAssetIds.push(asset.id);
  });

  test('POST /api/assets - should validate required id field', async () => {
    const assetData = {
      // missing id
      alt: 'Asset without ID',
      width: 1920,
      height: 1080
    };

    const response = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assetData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('id')
    });
  });

  test('POST /api/assets - should validate required alt field', async () => {
    const assetData = {
      id: 'test-asset-no-alt',
      // missing alt
      width: 1920,
      height: 1080
    };

    const response = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assetData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('alt')
    });
  });

  test('POST /api/assets - should validate alt text length limits', async () => {
    const assetData = {
      id: 'test-asset-long-alt',
      alt: 'x'.repeat(201), // exceeds 200 character limit
      width: 1920,
      height: 1080
    };

    const response = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assetData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('alt')
    });
  });

  test('POST /api/assets - should validate empty alt text', async () => {
    const assetData = {
      id: 'test-asset-empty-alt',
      alt: '', // empty alt text
      width: 1920,
      height: 1080
    };

    const response = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assetData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('alt')
    });
  });

  test('POST /api/assets - should validate caption length limits', async () => {
    const assetData = {
      id: 'test-asset-long-caption',
      alt: 'Asset with long caption',
      caption: 'x'.repeat(1001), // exceeds 1000 character limit
      width: 1920,
      height: 1080
    };

    const response = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assetData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('caption')
    });
  });

  test('POST /api/assets - should validate width and height are positive integers', async () => {
    const assetData = {
      id: 'test-asset-invalid-dimensions',
      alt: 'Asset with invalid dimensions',
      width: 0, // should be >= 1
      height: -1080 // should be >= 1
    };

    const response = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assetData)
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringMatching(/width|height/)
    });
  });

  test('POST /api/assets - should enforce unique asset ID', async () => {
    const assetData = {
      id: 'duplicate-asset-id',
      alt: 'First asset with this ID',
      width: 1920,
      height: 1080
    };

    // Create first asset
    const firstResponse = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assetData)
    });
    expect(firstResponse.status).toBe(201);
    const firstAsset = await firstResponse.json();
    testAssetIds.push(firstAsset.id);

    // Try to create second asset with same ID
    const duplicateData = {
      id: 'duplicate-asset-id',
      alt: 'Second asset with same ID',
      width: 1280,
      height: 720
    };

    const secondResponse = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(duplicateData)
    });

    expect(secondResponse.status).toBe(409);
    expect(await secondResponse.json()).toMatchObject({
      error: expect.any(String),
      message: expect.stringContaining('already exists')
    });
  });

  test('POST /api/assets - should handle null caption gracefully', async () => {
    const assetData = {
      id: 'test-asset-null-caption',
      alt: 'Asset with null caption',
      caption: null,
      width: 1920,
      height: 1080
    };

    const response = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assetData)
    });

    expect(response.status).toBe(201);

    const asset = await response.json();
    expect(asset.caption).toBeNull();
    testAssetIds.push(asset.id);
  });

  test('POST /api/assets - should handle complex metadata_json', async () => {
    const assetData = {
      id: 'test-asset-complex-metadata',
      alt: 'Asset with complex metadata',
      width: 4000,
      height: 3000,
      metadata_json: {
        exif: {
          camera: {
            make: 'Sony',
            model: 'α7R IV',
            serial: 'ABC123456'
          },
          lens: {
            make: 'Sony',
            model: 'FE 24-70mm F2.8 GM',
            focal_length: 35,
            aperture: 2.8
          },
          settings: {
            iso: 100,
            shutter_speed: '1/60',
            exposure_compensation: '+0.3'
          }
        },
        location: {
          latitude: 25.0330,
          longitude: 121.5654,
          altitude: 100,
          place_name: 'Taipei, Taiwan'
        },
        keywords: ['landscape', 'urban', 'architecture'],
        rating: 5
      }
    };

    const response = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assetData)
    });

    expect(response.status).toBe(201);

    const asset = await response.json();
    expect(asset.metadata_json).toEqual(assetData.metadata_json);
    testAssetIds.push(asset.id);
  });
});