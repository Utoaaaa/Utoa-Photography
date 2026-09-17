import { adminAuthError } from '@/lib/auth';
import { NextRequest } from 'next/server';

async function mapContext(context: { params: Promise<{ collectionId: string; assetId: string }> }) {
  const p = await Promise.resolve(context.params);
  const cid = (p as any).collectionId as string;
  const aid = (p as any).assetId as string;
  return { params: Promise.resolve({ collection_id: cid, asset_id: aid }) } as any;
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ collectionId: string; assetId: string }> }
) {
  const authError = await adminAuthError(request);
  if (authError) return authError;

  const mod = await import('@/lib/api-handlers/collection-asset');
  const mapped = await mapContext(context);
  return mod.DELETE(request, mapped);
}

