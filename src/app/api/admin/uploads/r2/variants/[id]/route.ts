import { adminAuthError } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { NEW_IMAGE_VARIANTS } from '@/lib/image-variants';
import { regenerateR2Variants } from '@/lib/r2-variants';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = await adminAuthError(request);
  if (authError) return authError;

  const mod = await import('@/app/api/uploads/r2/variants/[id]/route');
  return mod.GET(request, context as any);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = await adminAuthError(request);
  if (authError) return authError;

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
