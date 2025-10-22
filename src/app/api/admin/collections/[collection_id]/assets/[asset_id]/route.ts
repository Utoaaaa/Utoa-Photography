import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ collection_id: string; asset_id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  const mod = await import('@/app/api/collections/[collection_id]/assets/[asset_id]/route');
  return mod.DELETE(request, context as any);
}
