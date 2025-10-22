import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

async function mapContext(context: { params: Promise<{ yearId: string }> }) {
  const p = await Promise.resolve(context.params);
  const id = (p as any).yearId as string;
  return { params: Promise.resolve({ year_id: id }) } as any;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ yearId: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  const mod = await import('@/app/api/years/[year_id]/route');
  const mapped = await mapContext(context);
  return mod.GET(request, mapped);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ yearId: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  const mod = await import('@/app/api/years/[year_id]/route');
  const mapped = await mapContext(context);
  return mod.PUT(request, mapped);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ yearId: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  const mod = await import('@/app/api/years/[year_id]/route');
  const mapped = await mapContext(context);
  return mod.DELETE(request, mapped);
}

