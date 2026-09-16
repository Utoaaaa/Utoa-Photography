import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { NEW_IMAGE_VARIANTS } from '@/lib/image-variants';
import { regenerateR2Variants } from '@/lib/r2-variants';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  const mod = await import('@/app/api/uploads/r2/variants/[id]/route');
  return mod.GET(request, context as any);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const additionsOnly = request.nextUrl.searchParams.get('scope') === 'new';
    const result = await regenerateR2Variants(id, {
      onlyMissing: true,
      ...(additionsOnly ? { variants: NEW_IMAGE_VARIANTS } : {}),
    });
    return NextResponse.json({ ok: result.errors.length === 0, ...result }, { status: result.errors.length ? 422 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to regenerate variants';
    return NextResponse.json({ error: 'variant_regeneration_failed', message }, { status: 500 });
  }
}
