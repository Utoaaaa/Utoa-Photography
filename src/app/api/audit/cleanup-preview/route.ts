import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

/**
 * GET /api/audit/cleanup-preview
 * 
 * Preview audit logs that would be deleted based on retention policy
 * Does NOT actually delete anything - read-only preview
 * 
 * Query parameters:
 * - retention_days: Number of days to retain (default: 180, per FR-009)
 * 
 * Returns:
 * {
 *   count: number,              // Number of logs that would be deleted
 *   cutoff_date: string,        // ISO timestamp cutoff
 *   oldest_log_date: string?,   // Oldest log in database
 *   preview: AuditLog[]         // Sample of logs to be deleted (max 10)
 * }
 */

const querySchema = z.object({
  retention_days: z.coerce.number().int().min(1).max(365).default(180)
});

export async function GET(request: NextRequest) {
  try {
    // Admin-only endpoint
    const bypassAuth = process.env.BYPASS_ACCESS_FOR_TESTS === 'true';
    const authHeader = request.headers.get('authorization');
    const cfAccessToken = request.headers.get('cf-access-token');
    
    if (!bypassAuth && !authHeader && !cfAccessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validationResult = querySchema.safeParse(queryParams);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid parameters',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { retention_days } = validationResult.data;

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retention_days);

    // Find oldest log
    const oldestLog = await prisma.auditLog.findFirst({
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true }
    });

    // Count logs older than cutoff
    const count = await prisma.auditLog.count({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    });

    // Get preview sample (max 10)
    const preview = await prisma.auditLog.findMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      },
      orderBy: { timestamp: 'asc' },
      take: 10,
      select: {
        id: true,
        entity_type: true,
        entity_id: true,
        action: true,
        timestamp: true,
        actor: true
      }
    });

    return NextResponse.json({
      count,
      cutoff_date: cutoffDate.toISOString(),
      oldest_log_date: oldestLog?.timestamp.toISOString() || null,
      retention_policy_days: retention_days,
      preview: preview.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString()
      }))
    });
  } catch (error) {
    console.error('Error in cleanup preview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
