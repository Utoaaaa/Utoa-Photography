import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

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
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  const mod = await import('@/app/api/collections/[collection_id]/assets/[asset_id]/route');
  const mapped = await mapContext(context);
  return mod.DELETE(request, mapped);
}

