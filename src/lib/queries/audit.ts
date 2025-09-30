import { prisma } from '@/lib/db';

export type AuditEntity = 'collection' | 'year' | 'asset';
export type AuditAction = 'publish' | 'unpublish' | 'update';

export interface AuditQueryParams {
  entity: AuditEntity;
  entityId?: string;
  from?: Date | string;
  to?: Date | string;
  action?: AuditAction;
  limit?: number; // default 50, max 100
  offset?: number; // default 0
}

function coerceDate(input?: Date | string) {
  if (!input) return undefined;
  if (input instanceof Date) return input;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function queryAudit(params: AuditQueryParams) {
  const { entity, entityId } = params;
  const from = coerceDate(params.from);
  const to = coerceDate(params.to);
  const action = params.action;
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
  const offset = Math.max(params.offset ?? 0, 0);

  if (entity !== 'collection') {
    // For now, only collection publish history is persisted
    return [] as const;
  }

  const where: any = {};
  if (entityId) where.collection_id = entityId;
  if (from || to) {
    where.published_at = {} as { gte?: Date; lte?: Date };
    if (from) where.published_at.gte = from;
    if (to) where.published_at.lte = to;
  }
  if (action) where.action = action;

  try {
    // @ts-ignore - Prisma client property name for PublishHistory model
    const rows = await prisma.publishHistory.findMany({
      where,
      orderBy: [{ published_at: 'desc' }, { version: 'desc' }],
      skip: offset,
      take: limit,
    });
    return rows;
  } catch (error) {
    console.error('queryAudit failed:', error);
    return [] as const;
  }
}

export type PublishHistoryRow = Awaited<ReturnType<typeof queryAudit>>[number];
