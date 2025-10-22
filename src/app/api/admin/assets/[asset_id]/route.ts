import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ asset_id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  const mod = await import('@/app/api/assets/[asset_id]/route');
  return mod.GET(request, context as any);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ asset_id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  const mod = await import('@/app/api/assets/[asset_id]/route');
  return mod.PUT(request, context as any);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ asset_id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  const mod = await import('@/app/api/assets/[asset_id]/route');
  return mod.DELETE(request, context as any);
}
