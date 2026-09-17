import { adminAuthError } from '@/lib/auth';
import { NextRequest } from 'next/server';

async function mapContext(context: { params: Promise<{ yearId: string }> }) {
  const p = await Promise.resolve(context.params);
  const id = (p as any).yearId as string;
  return { params: Promise.resolve({ year_id: id }) } as any;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ yearId: string }> }
) {
  const authError = await adminAuthError(request);
  if (authError) return authError;

  const mod = await import('@/lib/api-handlers/year');
  const mapped = await mapContext(context);
  return mod.GET(request, mapped);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ yearId: string }> }
) {
  const authError = await adminAuthError(request);
  if (authError) return authError;

  const mod = await import('@/lib/api-handlers/year');
  const mapped = await mapContext(context);
  return mod.PUT(request, mapped);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ yearId: string }> }
) {
  const authError = await adminAuthError(request);
  if (authError) return authError;

  const mod = await import('@/lib/api-handlers/year');
  const mapped = await mapContext(context);
  return mod.DELETE(request, mapped);
}

