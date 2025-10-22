import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

async function mapContext(context: { params: Promise<{ collectionId: string }> }) {
  const p = await Promise.resolve(context.params);
  const id = (p as any).collectionId as string;
  return { params: Promise.resolve({ collection_id: id }) } as any;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ collectionId: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  const mod = await import('@/app/api/collections/[collection_id]/assets/route');
  const mapped = await mapContext(context);
  return mod.POST(request, mapped);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ collectionId: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  const mod = await import('@/app/api/collections/[collection_id]/assets/route');
  const mapped = await mapContext(context);
  return mod.PUT(request, mapped);
}

