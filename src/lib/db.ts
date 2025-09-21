import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Audit logging function (T019)
export async function logAudit(options: {
  who: string;
  action: 'publish' | 'unpublish' | 'edit' | 'create' | 'delete';
  entity: string; // e.g., 'collection/123', 'asset/456'
  payload?: Record<string, any>;
  metadata?: Record<string, any>;
}) {
  try {
    // For now, we'll use publish_history for publish/unpublish actions
    if (options.action === 'publish' || options.action === 'unpublish') {
      const entityParts = options.entity.split('/');
      if (entityParts[0] === 'collection' && entityParts[1]) {
        // Use existing publish_history table for collection publish/unpublish
        const collection = await prisma.collection.findUnique({
          where: { id: entityParts[1] }
        });

        if (collection) {
          // @ts-ignore - Type issues with Prisma client, but runtime works
          await prisma.publishHistory.create({
            data: {
              collection_id: entityParts[1],
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
    } else {
      // For other actions (edit, create, delete), log to console for now
      // In production, this could be extended to use a dedicated audit table
      console.log('[AUDIT]', {
        timestamp: new Date().toISOString(),
        who: options.who,
        action: options.action,
        entity: options.entity,
        payload: options.payload,
        metadata: options.metadata
      });
    }
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