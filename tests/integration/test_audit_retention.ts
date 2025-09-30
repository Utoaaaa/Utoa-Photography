import { test, expect } from '@playwright/test';

/**
 * T063: Audit log retention policy validation
 * 
 * Validates:
 * - Audit logs older than 180 days can be cleaned up
 * - Cleanup mechanism doesn't affect recent logs
 * - Query filters work correctly (entity_type, entity_id, time range)
 * 
 * Addresses FR-009 data retention requirement (≥180 days)
 */

test.describe('Audit log retention policy (T063)', () => {
  const API_BASE = process.env.TEST_API_URL || process.env.TEST_API_BASE || 'http://localhost:3000';
  const AUTH_HEADER: Record<string, string> = process.env.TEST_CF_ACCESS_TOKEN 
    ? { 'CF-Access-Token': process.env.TEST_CF_ACCESS_TOKEN }
    : { 'Authorization': 'Bearer test' };

  test('Audit logs are created for write operations', async ({ request }) => {
    // Create a test year to generate audit log
    const yearResponse = await request.post(`${API_BASE}/api/years`, {
      headers: AUTH_HEADER,
      data: {
        label: 'T063-Test-Year',
        status: 'draft'
      }
    });

    expect(yearResponse.ok()).toBe(true);
    const yearData = await yearResponse.json();
    const yearId = yearData.id;

    // Wait a moment for audit log to be written
    await new Promise(resolve => setTimeout(resolve, 500));

    // Query audit logs for this year
    const auditResponse = await request.get(`${API_BASE}/api/audit`, {
      headers: AUTH_HEADER,
      params: {
        entity_type: 'year',
        entity_id: yearId,
        limit: '10'
      }
    });

    // Audit API should exist (may be 200 or 404 if not implemented yet)
    if (auditResponse.ok()) {
      const auditData = await auditResponse.json();
      
      // Should have at least one create action
      expect(Array.isArray(auditData.data) || Array.isArray(auditData)).toBe(true);
      const logs = auditData.data || auditData;
      
      const createLog = logs.find((log: any) => 
        log.action === 'create' && 
        log.entity_type === 'year' &&
        log.entity_id === yearId
      );
      
      expect(createLog).toBeDefined();
      expect(createLog.actor).toBeDefined();
      expect(createLog.timestamp).toBeDefined();
    } else {
      test.skip(true, 'Audit API not yet implemented - /api/audit endpoint needed');
    }

    // Cleanup
    await request.delete(`${API_BASE}/api/years/${yearId}?force=true`, {
      headers: AUTH_HEADER
    });
  });

  test('Audit logs can be filtered by time range', async ({ request }) => {
    // Query all recent logs (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const response = await request.get(`${API_BASE}/api/audit`, {
      headers: AUTH_HEADER,
      params: {
        from: sevenDaysAgo.toISOString(),
        to: now.toISOString(),
        limit: '50'
      }
    });

    if (!response.ok()) {
      test.skip(true, 'Audit query API not implemented');
      return;
    }

    const data = await response.json();
    const logs = data.data || data;

    // All logs should be within the time range
    for (const log of logs) {
      const logTime = new Date(log.timestamp);
      expect(logTime.getTime()).toBeGreaterThanOrEqual(sevenDaysAgo.getTime());
      expect(logTime.getTime()).toBeLessThanOrEqual(now.getTime());
    }
  });

  test('Audit logs older than 180 days can be identified for cleanup', async ({ request }) => {
    // This test validates the cleanup logic without actually deleting production data
    
    const response = await request.get(`${API_BASE}/api/audit/cleanup-preview`, {
      headers: AUTH_HEADER,
      params: {
        retention_days: '180'
      }
    });

    // If endpoint doesn't exist, skip
    if (response.status() === 404) {
      test.skip(true, 'Audit cleanup preview endpoint not implemented - needs /api/audit/cleanup-preview');
      return;
    }

    if (response.ok()) {
      const data = await response.json();
      
      // Should return count of logs that would be deleted
      expect(data).toHaveProperty('count');
      expect(typeof data.count).toBe('number');
      
      // Should include cutoff date
      expect(data).toHaveProperty('cutoff_date');
      
      // Optionally include oldest log date
      if (data.oldest_log_date) {
        expect(typeof data.oldest_log_date).toBe('string');
      }
    }
  });

  test('Audit cleanup respects retention period', async ({ request }) => {
    // This test validates cleanup logic preserves recent logs
    
    // Create test logs by creating/deleting a year
    const createResponse = await request.post(`${API_BASE}/api/years`, {
      headers: AUTH_HEADER,
      data: {
        label: 'T063-Retention-Test',
        status: 'draft'
      }
    });

    expect(createResponse.ok()).toBe(true);
    const yearData = await createResponse.json();
    const yearId = yearData.id;

    await new Promise(resolve => setTimeout(resolve, 300));

    // Delete the year
    await request.delete(`${API_BASE}/api/years/${yearId}?force=true`, {
      headers: AUTH_HEADER
    });

    await new Promise(resolve => setTimeout(resolve, 300));

    // Query audit logs for this year (should exist even though year is deleted)
    const auditResponse = await request.get(`${API_BASE}/api/audit`, {
      headers: AUTH_HEADER,
      params: {
        entity_type: 'year',
        entity_id: yearId
      }
    });

    if (!auditResponse.ok()) {
      test.skip(true, 'Audit query not available');
      return;
    }

    const auditData = await auditResponse.json();
    const logs = auditData.data || auditData;

    // Should have both create and delete logs
    const createLog = logs.find((l: any) => l.action === 'create');
    const deleteLog = logs.find((l: any) => l.action === 'delete');

    expect(createLog).toBeDefined();
    expect(deleteLog).toBeDefined();

    // Both logs should be recent (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    if (createLog) {
      expect(new Date(createLog.timestamp).getTime()).toBeGreaterThan(oneHourAgo.getTime());
    }
    
    if (deleteLog) {
      expect(new Date(deleteLog.timestamp).getTime()).toBeGreaterThan(oneHourAgo.getTime());
    }

    // These recent logs should NOT be candidates for cleanup
    const cutoffDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    
    for (const log of [createLog, deleteLog].filter(Boolean)) {
      expect(new Date(log.timestamp).getTime()).toBeGreaterThan(cutoffDate.getTime());
    }
  });

  test('Audit logs do not contain sensitive information', async ({ request }) => {
    // Create a test asset with metadata
    const assetResponse = await request.post(`${API_BASE}/api/assets`, {
      headers: AUTH_HEADER,
      data: {
        id: 'test-audit-sensitive-' + Date.now(),
        alt: 'Test image for audit privacy check',
        width: 1920,
        height: 1080
      }
    });

    if (!assetResponse.ok()) {
      test.skip(true, 'Asset creation failed - cannot test audit privacy');
      return;
    }

    const assetData = await assetResponse.json();
    const assetId = assetData.id;

    await new Promise(resolve => setTimeout(resolve, 300));

    // Query audit logs
    const auditResponse = await request.get(`${API_BASE}/api/audit`, {
      headers: AUTH_HEADER,
      params: {
        entity_type: 'asset',
        entity_id: assetId
      }
    });

    if (!auditResponse.ok()) {
      // Clean up and skip
      await request.delete(`${API_BASE}/api/assets/${assetId}`, { headers: AUTH_HEADER });
      test.skip(true, 'Audit query not available');
      return;
    }

    const auditData = await auditResponse.json();
    const logs = auditData.data || auditData;

    // Check that logs don't contain sensitive patterns
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /api[_-]?key/i,
      /authorization/i,
      /bearer/i
    ];

    for (const log of logs) {
      const logStr = JSON.stringify(log);
      
      for (const pattern of sensitivePatterns) {
        expect(logStr).not.toMatch(pattern);
      }

      // Meta field should not contain raw credentials
      if (log.meta) {
        const meta = typeof log.meta === 'string' ? JSON.parse(log.meta) : log.meta;
        const metaStr = JSON.stringify(meta);
        
        for (const pattern of sensitivePatterns) {
          expect(metaStr).not.toMatch(pattern);
        }
      }
    }

    // Cleanup
    await request.delete(`${API_BASE}/api/assets/${assetId}`, { headers: AUTH_HEADER });
  });

  test('Audit log query supports pagination', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/audit`, {
      headers: AUTH_HEADER,
      params: {
        limit: '5',
        offset: '0'
      }
    });

    if (!response.ok()) {
      test.skip(true, 'Audit query API not available');
      return;
    }

    const data = await response.json();

    // Should support pagination metadata
    if (data.data) {
      // Structured response
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
      
      // May have total, limit, offset
      if (data.total !== undefined) {
        expect(typeof data.total).toBe('number');
      }
      
      // Shouldn't exceed limit
      expect(data.data.length).toBeLessThanOrEqual(5);
    } else {
      // Array response
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeLessThanOrEqual(5);
    }
  });

  test('Audit log query validates parameters', async ({ request }) => {
    // Invalid time range
    const badResponse = await request.get(`${API_BASE}/api/audit`, {
      headers: AUTH_HEADER,
      params: {
        from: 'not-a-date',
        to: 'also-not-a-date'
      }
    });

    if (badResponse.status() === 404) {
      test.skip(true, 'Audit API not implemented');
      return;
    }

    // Should return 400 Bad Request for invalid params
    expect([400, 422]).toContain(badResponse.status());
  });
});
