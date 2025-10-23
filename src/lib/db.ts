import { PrismaClient } from '@prisma/client';
import { writeAudit } from './utils';

// Runtime-aware Prisma client that uses D1 in Cloudflare Workers and node client locally
let nodeClient: PrismaClient | undefined;
const d1ClientCache: WeakMap<any, PrismaClient> = new WeakMap();

function getClient(): PrismaClient {
  // Try to use Cloudflare D1 when running on Workers (edge runtime)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getRequestContext } = require('next/server');
    const ctx = typeof getRequestContext === 'function' ? getRequestContext() : undefined;
    const env = ctx?.cloudflare?.env as { DB?: any } | undefined;
    const d1 = env?.DB;
    if (d1) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PrismaD1 } = require('@prisma/adapter-d1');
      let client = d1ClientCache.get(d1);
      if (!client) {
        const adapter = new PrismaD1(d1);
        client = new PrismaClient({ adapter });
        d1ClientCache.set(d1, client);
      }
      return client;
    }
  } catch {
    // ignore and fall back to node client
  }

  if (!nodeClient) {
    nodeClient = new PrismaClient();
    if (process.env.NODE_ENV !== 'production') {
      // @ts-ignore attach for hot-reload reuse
      (globalThis as any).__PRISMA_NODE__ = nodeClient;
    }
  }
  return nodeClient;
}

// Export a proxy so existing imports `prisma.model...` keep working
export const prisma = new Proxy({} as unknown as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = getClient() as any;
    return client[prop];
  },
}) as unknown as PrismaClient;

// Audit logging function (T019)
export type AuditAction =
  | 'publish'
  | 'unpublish'
  | 'edit'
  | 'create'
  | 'delete'
  | 'link'
  | 'unlink'
  | 'sort'
  | 'revalidate';

export async function logAudit(options: {
  who: string;
  action: AuditAction;
  entity: string; // e.g., 'collection/123', 'asset/456'
  payload?: Record<string, any>;
  metadata?: Record<string, any>;
}) {
  try {
    // Parse entity string to extract type and id
    const entityParts = options.entity.split('/');
    const entity_type = entityParts[0]; // 'collection', 'asset', 'year', etc.
    const entity_id = entityParts[1] || 'unknown';

    // For publish/unpublish actions, also create publish_history record
    if (options.action === 'publish' || options.action === 'unpublish') {
      if (entity_type === 'collection' && entity_id !== 'unknown') {
        const collection = await prisma.collection.findUnique({
          where: { id: entity_id }
        });

        if (collection) {
          // @ts-ignore - Type issues with Prisma client, but runtime works
          await prisma.publishHistory.create({
            data: {
              collection_id: entity_id,
              version: (collection as any).version,
              action: options.action === 'publish' ? 'publish' : 'unpublish',
              note: options.payload?.note || '',
              user_id: options.who,
              snapshot_data: JSON.stringify({
                action: options.action,
                metadata: options.metadata,
                payload: options.payload,
                timestamp: new Date().toISOString()
              })
            }
          });
        }
      }
    }

    // Always write to audit_logs table (FR-009)
    await prisma.auditLog.create({
      data: {
        actor: options.who,
        actor_type: 'system', // Could be extended to support 'user', 'api'
        entity_type,
        entity_id,
        action: options.action,
        meta: JSON.stringify({
          payload: options.payload,
          metadata: options.metadata
        })
      }
    });

    // Also call the legacy audit sink if configured
    await writeAudit({
      timestamp: new Date().toISOString(),
      who: options.who,
      action: options.action,
      entity: options.entity,
      payload: options.payload,
      metadata: options.metadata,
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
    // Don't throw - audit failures shouldn't break business logic
  }
}

// Helper to get audit trail for a collection
export async function getCollectionAuditTrail(collectionId: string) {
  try {
    // @ts-ignore - Type issues with Prisma client, but runtime works
    return await prisma.publishHistory.findMany({
      where: { collection_id: collectionId },
      orderBy: { published_at: 'desc' },
      take: 20 // Last 20 entries
    });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    return [];
  }
}
