import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { shouldUseD1Direct } from '@/lib/d1-queries';
import { getD1Database } from '@/lib/cloudflare';

type PrismaClient = import('@prisma/client').PrismaClient;

let prismaPromise: Promise<PrismaClient> | null = null;

async function getPrisma() {
  if (!prismaPromise) {
    prismaPromise = import('@/lib/db').then(({ prisma }) => prisma);
  }
  return prismaPromise;
}

function requireD1() {
  const db = getD1Database();
  if (!db) {
    throw new Error('D1 database not available');
  }
  return db;
}

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

    const useD1 = shouldUseD1Direct();
    const cutoffIso = cutoffDate.toISOString();

    let oldestLogDate: string | null = null;
    let count = 0;
    let preview: Array<{ id: string; entity_type: string; entity_id: string; action: string; timestamp: string; actor: string | null }> = [];

    if (useD1) {
      const db = requireD1();

      const oldestRow = await db.prepare(
        'SELECT timestamp FROM audit_logs ORDER BY timestamp ASC LIMIT 1',
      ).first() as { timestamp?: string } | null;
      if (oldestRow?.timestamp) {
        oldestLogDate = new Date(oldestRow.timestamp).toISOString();
      }

      const countRow = await db.prepare(
        'SELECT COUNT(*) AS count FROM audit_logs WHERE timestamp < ?1',
      ).bind(cutoffIso).first() as { count?: number } | null;
      count = Number(countRow?.count ?? 0);

      const previewResult = await db.prepare(
        `
          SELECT id, entity_type, entity_id, action, timestamp, actor
          FROM audit_logs
          WHERE timestamp < ?1
          ORDER BY timestamp ASC
          LIMIT 10
        `,
      ).bind(cutoffIso).all();

      preview = (previewResult.results ?? []).map((row: Record<string, unknown>) => ({
        id: String(row.id),
        entity_type: String(row.entity_type ?? ''),
        entity_id: String(row.entity_id ?? ''),
        action: String(row.action ?? ''),
        timestamp: new Date(String(row.timestamp)).toISOString(),
        actor: row.actor ? String(row.actor) : null,
      }));
    } else {
      const prisma = await getPrisma();

      const oldestLog = await prisma.auditLog.findFirst({
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true }
      });

      if (oldestLog?.timestamp) {
        oldestLogDate = oldestLog.timestamp.toISOString();
      }

      count = await prisma.auditLog.count({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      const prismaPreview = await prisma.auditLog.findMany({
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

      preview = prismaPreview.map(log => ({
        id: log.id,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        action: log.action,
        timestamp: log.timestamp.toISOString(),
        actor: log.actor,
      }));
    }

    return NextResponse.json({
      count,
      cutoff_date: cutoffDate.toISOString(),
      oldest_log_date: oldestLogDate,
      retention_policy_days: retention_days,
      preview
    });
  } catch (error) {
    console.error('Error in cleanup preview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
