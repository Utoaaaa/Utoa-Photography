import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ collection_id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  const mod = await import('@/app/api/collections/[collection_id]/assets/route');
  return mod.POST(request, context as any);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ collection_id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  const mod = await import('@/app/api/collections/[collection_id]/assets/route');
  return mod.PUT(request, context as any);
}
