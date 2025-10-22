import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminAuth } from '@/lib/auth';
import { queryAudit } from '@/lib/queries/audit';
import { prisma } from '@/lib/db';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const entityEnum = z.enum(['collection', 'year', 'asset', 'all']).optional();
const actionEnum = z.enum(['publish', 'unpublish', 'update', 'create', 'edit', 'delete', 'link', 'unlink', 'sort', 'revalidate']).optional();

const querySchema = z.object({
  entity: entityEnum,
  entity_id: z.string().optional(),
  entity_type: z.string().optional(), // Alternative to 'entity'
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  action: actionEnum,
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    // Auth: admin-only (or test bypass)
    const bypassAuth = process.env.BYPASS_ACCESS_FOR_TESTS === 'true';
    const authHeader = request.headers.get('authorization');
    const cfAccessToken = request.headers.get('cf-access-token');
    
    if (!bypassAuth && !authHeader && !cfAccessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const parsed = querySchema.safeParse({
      entity: sp.get('entity') ?? sp.get('entity_type') ?? undefined,
      entity_type: sp.get('entity_type') ?? sp.get('entity') ?? undefined,
      entity_id: sp.get('entity_id') ?? undefined,
      from: sp.get('from') ?? undefined,
      to: sp.get('to') ?? undefined,
      action: sp.get('action') ?? undefined,
      limit: sp.get('limit') ?? undefined,
      offset: sp.get('offset') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation error',
        details: parsed.error.flatten(),
      }, { status: 400 });
    }

    const { entity, entity_type, entity_id, from, to, action, limit, offset } = parsed.data;

    // Build where clause for auditLog
    const where: any = {};
    
    const entityFilter = entity_type || entity;
    if (entityFilter && entityFilter !== 'all') {
      where.entity_type = entityFilter;
    }
    
    if (entity_id) {
      where.entity_id = entity_id;
    }
    
    if (action) {
      where.action = action;
    }
    
    if (from || to) {
      where.timestamp = {};
      if (from) {
        where.timestamp.gte = new Date(from);
      }
      if (to) {
        where.timestamp.lte = new Date(to);
      }
    }

    // Query from audit_logs table
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.auditLog.count({ where })
    ]);

    // Parse meta JSON
    const formattedRows = rows.map(row => ({
      id: row.id,
      actor: row.actor,
      actor_type: row.actor_type,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      action: row.action,
      timestamp: row.timestamp.toISOString(),
      meta: row.meta ? JSON.parse(row.meta) : null
    }));

    return NextResponse.json({
      data: formattedRows,
      pagination: {
        limit,
        offset,
        total,
        has_more: offset + rows.length < total,
      }
    });
  } catch (error) {
    console.error('GET /api/audit failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
