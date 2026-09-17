import { adminAuthError } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getR2Bucket } from '@/lib/cloudflare';

const VARIANTS = ['thumb','small','medium','desktop','large','original'] as const;
const EXTS = ['webp','avif','jpg','jpeg','png'] as const;

type R2Bucket = {
  get(key: string, options?: { range?: { offset: number; length?: number } }): Promise<{
    body: ReadableStream | null;
  } | null>;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await adminAuthError(_request);
  if (authError) return authError;

  const { id } = await params;
  try {
    const bucket: R2Bucket | undefined = getR2Bucket();
    if (!bucket) {
      return NextResponse.json({ error: 'storage unavailable' }, { status: 500 });
    }

    const result: Record<string, boolean> = {};
    for (const v of VARIANTS) {
      let exists = false;
      const extensions = v === 'small' || v === 'desktop'
        ? [(process.env.NEXT_PUBLIC_R2_VARIANT_EXT || 'webp').replace(/^\./, '')]
        : EXTS;
      for (const ext of extensions) {
        const key = `${process.env.NEXT_PUBLIC_R2_OBJECT_PREFIX || 'images'}/${id}/${v}.${ext}`;
        try {
          const obj = await bucket.get(key, { range: { offset: 0, length: 1 } });
          if (obj) { await obj.body?.cancel(); exists = true; break; }
        } catch {
          // ignore and try next
        }
      }
      result[v] = exists;
    }
    return NextResponse.json({ id, variants: result });
  } catch (error) {
    console.error('[variants] error', error);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
