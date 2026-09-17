import { adminAuthError } from '@/lib/auth';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ asset_id: string }> }
) {
  const authError = await adminAuthError(request);
  if (authError) return authError;

  const mod = await import('@/lib/api-handlers/asset');
  return mod.GET(request, context as any);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ asset_id: string }> }
) {
  const authError = await adminAuthError(request);
  if (authError) return authError;

  const mod = await import('@/lib/api-handlers/asset');
  return mod.PUT(request, context as any);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ asset_id: string }> }
) {
  const authError = await adminAuthError(request);
  if (authError) return authError;

  const mod = await import('@/lib/api-handlers/asset');
  return mod.DELETE(request, context as any);
}
