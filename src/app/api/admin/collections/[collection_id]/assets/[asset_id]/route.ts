import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { DELETE as PublicDELETE } from '@/app/api/collections/[collection_id]/assets/[asset_id]/route';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ collection_id: string; asset_id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  return PublicDELETE(request, context as any);
}

