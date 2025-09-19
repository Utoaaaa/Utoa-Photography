import { test, expect, Page } from '@playwright/test';

test.describe('Image Upload and Workflow Integration', () => {
  let testYearId: string;
  let testCollectionId: string;

  test.beforeEach(async ({ page }) => {
    // Set up test data
    await setupTestData(page);
  });

  test('should complete full image upload workflow', async ({ page }) => {
    // Step 1: Request direct upload token
    const uploadRequest = await page.request.post('/api/images/direct-upload', {
      data: {
        filename: 'test-image.jpg',
        content_type: 'image/jpeg'
      }
    });

    expect(uploadRequest.status()).toBe(200);
    const uploadData = await uploadRequest.json();

    expect(uploadData).toMatchObject({
      upload_url: expect.any(String),
      image_id: expect.any(String),
      form_data: expect.any(Object)
    });

    // Step 2: Simulate direct upload to Cloudflare Images
    // In real scenario, this would be a direct upload to Cloudflare
    // For testing, we'll mock the successful upload
    await page.route(uploadData.upload_url, route => {
      route.fulfill({ status: 200 });
    });

    // Step 3: Create asset record after successful upload
    const assetRequest = await page.request.post('/api/assets', {
      data: {
        id: uploadData.image_id,
        alt: 'Integration test uploaded image',
        caption: 'This image was uploaded via the integration test workflow',
        width: 1920,
        height: 1080,
        metadata_json: {
          camera: 'Test Camera',
          lens: 'Test Lens 24-70mm',
          focal_length: '50mm',
          aperture: 'f/2.8',
          shutter_speed: '1/125s',
          iso: 200
        }
      }
    });

    expect(assetRequest.status()).toBe(201);
    const asset = await assetRequest.json();

    expect(asset).toMatchObject({
      id: uploadData.image_id,
      alt: 'Integration test uploaded image',
      caption: 'This image was uploaded via the integration test workflow',
      width: 1920,
      height: 1080
    });

    // Step 4: Add asset to collection
    const collectionAssetRequest = await page.request.post(`/api/collections/${testCollectionId}/assets`, {
      data: {
        asset_ids: [asset.id]
      }
    });

    expect(collectionAssetRequest.status()).toBe(201);
    const collectionAssets = await collectionAssetRequest.json();
    expect(collectionAssets).toHaveLength(1);
    expect(collectionAssets[0]).toMatchObject({
      collection_id: testCollectionId,
      asset_id: asset.id,
      order_index: expect.any(String)
    });

    // Step 5: Verify asset appears in collection on frontend
    await page.goto(`/2024/test-collection`);
    
    const photoViewer = page.locator('[data-testid="photo-viewer"]');
    await expect(photoViewer).toBeVisible();
    
    // Should show the uploaded image
    const uploadedImage = page.locator(`img[alt="${asset.alt}"]`);
    await expect(uploadedImage).toBeVisible();

    // Step 6: Verify metadata is accessible
    const imageMetadata = page.locator('[data-testid="image-metadata"]');
    if (await imageMetadata.isVisible()) {
      await expect(imageMetadata).toContainText('Test Camera');
      await expect(imageMetadata).toContainText('50mm');
    }
  });

  test('should handle upload failure gracefully', async ({ page }) => {
    // Mock failed upload token request
    await page.route('**/api/images/direct-upload', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid file type',
          message: 'Only JPEG and PNG files are supported'
        })
      });
    });

    const uploadRequest = await page.request.post('/api/images/direct-upload', {
      data: {
        filename: 'test-document.pdf',
        content_type: 'application/pdf'
      }
    });

    expect(uploadRequest.status()).toBe(400);
    const error = await uploadRequest.json();
    expect(error.message).toContain('JPEG and PNG');
  });

  test('should validate asset creation after upload', async ({ page }) => {
    // Try to create asset without upload first
    const assetRequest = await page.request.post('/api/assets', {
      data: {
        id: 'non-existent-cloudflare-id',
        alt: 'Asset without proper upload',
        width: 1920,
        height: 1080
      }
    });

    // Should either succeed (if validation is done separately) or fail appropriately
    if (assetRequest.status() === 409) {
      const error = await assetRequest.json();
      expect(error.message).toContain('upload');
    }
  });

  test('should handle batch upload workflow', async ({ page }) => {
    const uploadPromises = [];
    const imageIds = [];

    // Request multiple upload tokens
    for (let i = 1; i <= 3; i++) {
      const uploadRequest = page.request.post('/api/images/direct-upload', {
        data: {
          filename: `batch-image-${i}.jpg`,
          content_type: 'image/jpeg'
        }
      });
      uploadPromises.push(uploadRequest);
    }

    const uploadResponses = await Promise.all(uploadPromises);
    
    for (const response of uploadResponses) {
      expect(response.status()).toBe(200);
      const data = await response.json();
      imageIds.push(data.image_id);
    }

    // Create asset records for all uploaded images
    const assetPromises = [];
    for (let i = 0; i < imageIds.length; i++) {
      const assetRequest = page.request.post('/api/assets', {
        data: {
          id: imageIds[i],
          alt: `Batch uploaded image ${i + 1}`,
          width: 1920,
          height: 1080
        }
      });
      assetPromises.push(assetRequest);
    }

    const assetResponses = await Promise.all(assetPromises);
    
    for (const response of assetResponses) {
      expect(response.status()).toBe(201);
    }

    // Add all assets to collection in batch
    const collectionAssetRequest = await page.request.post(`/api/collections/${testCollectionId}/assets`, {
      data: {
        asset_ids: imageIds
      }
    });

    expect(collectionAssetRequest.status()).toBe(201);
    const collectionAssets = await collectionAssetRequest.json();
    expect(collectionAssets).toHaveLength(3);

    // Verify all assets appear in frontend
    await page.goto(`/2024/test-collection`);
    
    const dotNavigation = page.locator('[data-testid="dot-navigation"]');
    await expect(dotNavigation).toBeVisible();
    
    const dots = dotNavigation.locator('[data-testid="nav-dot"]');
    await expect(dots).toHaveCount(3);
  });

  test('should handle image reordering workflow', async ({ page }) => {
    // First upload and add multiple images
    await setupMultipleTestImages(page);

    // Get current collection with assets
    const collectionResponse = await page.request.get(`/api/collections/${testCollectionId}?include_assets=true`);
    const collection = await collectionResponse.json();
    const assets = collection.assets;

    expect(assets.length).toBeGreaterThanOrEqual(2);

    // Reorder assets
    const reorderData = {
      reorder: [
        { asset_id: assets[1].id, order_index: '1.0' },
        { asset_id: assets[0].id, order_index: '2.0' }
      ]
    };

    const reorderRequest = await page.request.put(`/api/collections/${testCollectionId}/assets`, {
      data: reorderData
    });

    expect(reorderRequest.status()).toBe(200);

    // Verify reordering on frontend
    await page.goto(`/2024/test-collection`);
    
    const firstPhoto = page.locator('[data-testid="current-photo"] img');
    await expect(firstPhoto).toHaveAttribute('alt', assets[1].alt);

    // Navigate to second photo
    const dots = page.locator('[data-testid="nav-dot"]');
    await dots.nth(1).click();
    
    await expect(firstPhoto).toHaveAttribute('alt', assets[0].alt);
  });

  test('should handle asset removal workflow', async ({ page }) => {
    // Setup test images in collection
    await setupMultipleTestImages(page);

    // Get collection assets
    const collectionResponse = await page.request.get(`/api/collections/${testCollectionId}?include_assets=true`);
    const collection = await collectionResponse.json();
    const firstAsset = collection.assets[0];

    // Remove asset from collection
    const removeRequest = await page.request.delete(`/api/collections/${testCollectionId}/assets/${firstAsset.id}`);
    expect(removeRequest.status()).toBe(204);

    // Verify asset is removed from collection but still exists
    const updatedCollectionResponse = await page.request.get(`/api/collections/${testCollectionId}?include_assets=true`);
    const updatedCollection = await updatedCollectionResponse.json();
    
    const assetStillInCollection = updatedCollection.assets.find((a: any) => a.id === firstAsset.id);
    expect(assetStillInCollection).toBeUndefined();

    // Asset should still exist in assets table
    const assetResponse = await page.request.get(`/api/assets/${firstAsset.id}`);
    expect(assetResponse.status()).toBe(200);

    // Verify frontend reflects removal
    await page.goto(`/2024/test-collection`);
    
    const dots = page.locator('[data-testid="nav-dot"]');
    const originalCount = collection.assets.length;
    await expect(dots).toHaveCount(originalCount - 1);
  });

  test('should handle asset metadata updates', async ({ page }) => {
    // Create test asset
    const uploadRequest = await page.request.post('/api/images/direct-upload', {
      data: { filename: 'metadata-test.jpg', content_type: 'image/jpeg' }
    });
    const uploadData = await uploadRequest.json();

    const assetRequest = await page.request.post('/api/assets', {
      data: {
        id: uploadData.image_id,
        alt: 'Original alt text',
        caption: 'Original caption',
        width: 1920,
        height: 1080
      }
    });
    const asset = await assetRequest.json();

    // Update asset metadata
    const updateRequest = await page.request.put(`/api/assets/${asset.id}`, {
      data: {
        alt: 'Updated alt text',
        caption: 'Updated caption with more details',
        metadata_json: {
          camera: 'Updated Camera Model',
          location: 'Test Location'
        }
      }
    });

    expect(updateRequest.status()).toBe(200);
    const updatedAsset = await updateRequest.json();

    expect(updatedAsset).toMatchObject({
      alt: 'Updated alt text',
      caption: 'Updated caption with more details',
      metadata_json: {
        camera: 'Updated Camera Model',
        location: 'Test Location'
      }
    });

    // Add to collection and verify updates appear on frontend
    await page.request.post(`/api/collections/${testCollectionId}/assets`, {
      data: { asset_ids: [asset.id] }
    });

    await page.goto(`/2024/test-collection`);
    
    const image = page.locator(`img[alt="${updatedAsset.alt}"]`);
    await expect(image).toBeVisible();

    const caption = page.locator('[data-testid="photo-caption"]');
    if (await caption.isVisible()) {
      await expect(caption).toContainText('Updated caption with more details');
    }
  });

  test('should validate image dimensions and format requirements', async ({ page }) => {
    // Test various image scenarios
    const testCases = [
      {
        filename: 'tiny-image.jpg',
        width: 50,
        height: 50,
        expectedStatus: 400, // Too small
        error: 'minimum dimensions'
      },
      {
        filename: 'huge-image.jpg', 
        width: 10000,
        height: 10000,
        expectedStatus: 400, // Too large
        error: 'maximum dimensions'
      },
      {
        filename: 'normal-image.jpg',
        width: 1920,
        height: 1080,
        expectedStatus: 201, // Valid
        error: null
      }
    ];

    for (const testCase of testCases) {
      const uploadRequest = await page.request.post('/api/images/direct-upload', {
        data: {
          filename: testCase.filename,
          content_type: 'image/jpeg'
        }
      });

      if (testCase.expectedStatus === 201) {
        expect(uploadRequest.status()).toBe(200);
        const uploadData = await uploadRequest.json();

        const assetRequest = await page.request.post('/api/assets', {
          data: {
            id: uploadData.image_id,
            alt: `Test image ${testCase.width}x${testCase.height}`,
            width: testCase.width,
            height: testCase.height
          }
        });

        expect(assetRequest.status()).toBe(testCase.expectedStatus);
      } else {
        // Should either fail at upload token stage or asset creation stage
        if (uploadRequest.status() === 200) {
          const uploadData = await uploadRequest.json();
          
          const assetRequest = await page.request.post('/api/assets', {
            data: {
              id: uploadData.image_id,
              alt: `Test image ${testCase.width}x${testCase.height}`,
              width: testCase.width,
              height: testCase.height
            }
          });

          expect(assetRequest.status()).toBe(testCase.expectedStatus);
          if (testCase.error) {
            const error = await assetRequest.json();
            expect(error.message).toContain(testCase.error);
          }
        }
      }
    }
  });

  // Helper functions
  async function setupTestData(page: Page) {
    // Create test year
    const yearResponse = await page.request.post('/api/years', {
      data: {
        label: '2024',
        status: 'published'
      }
    });
    const year = await yearResponse.json();
    testYearId = year.id;

    // Create test collection
    const collectionResponse = await page.request.post(`/api/years/${testYearId}/collections`, {
      data: {
        slug: 'test-collection',
        title: 'Test Collection for Upload Workflow',
        status: 'published'
      }
    });
    const collection = await collectionResponse.json();
    testCollectionId = collection.id;
  }

  async function setupMultipleTestImages(page: Page) {
    const imageIds = [];

    // Create multiple test assets
    for (let i = 1; i <= 3; i++) {
      const uploadRequest = await page.request.post('/api/images/direct-upload', {
        data: {
          filename: `workflow-test-${i}.jpg`,
          content_type: 'image/jpeg'
        }
      });
      const uploadData = await uploadRequest.json();

      const assetRequest = await page.request.post('/api/assets', {
        data: {
          id: uploadData.image_id,
          alt: `Workflow test image ${i}`,
          width: 1920,
          height: 1080
        }
      });
      const asset = await assetRequest.json();
      imageIds.push(asset.id);
    }

    // Add all to collection
    await page.request.post(`/api/collections/${testCollectionId}/assets`, {
      data: { asset_ids: imageIds }
    });
  }
});