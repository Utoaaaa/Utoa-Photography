import { adminAuthError } from '@/lib/auth';
import { NextRequest } from 'next/server';

async function mapContext(context: { params: Promise<{ collectionId: string }> }) {
  const p = await Promise.resolve(context.params);
  const id = (p as any).collectionId as string;
  return { params: Promise.resolve({ collection_id: id }) } as any;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ collectionId: string }> }
) {
  const authError = await adminAuthError(request);
  if (authError) return authError;

  const mod = await import('@/lib/api-handlers/collection');
  const mapped = await mapContext(context);
  return mod.GET(request, mapped);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ collectionId: string }> }
) {
  const authError = await adminAuthError(request);
  if (authError) return authError;

  const mod = await import('@/lib/api-handlers/collection');
  const mapped = await mapContext(context);
  return mod.PUT(request, mapped);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ collectionId: string }> }
) {
  const authError = await adminAuthError(request);
  if (authError) return authError;

  const mod = await import('@/lib/api-handlers/collection');
  const mapped = await mapContext(context);
  return mod.DELETE(request, mapped);
}

