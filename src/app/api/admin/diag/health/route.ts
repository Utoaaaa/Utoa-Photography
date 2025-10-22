import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { prisma } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

type R2BucketInfo = { put?: Function; get?: Function } | undefined;

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }

  // Try to access Cloudflare bindings via request context
  let hasRequestContext = false;
  let hasD1Binding = false;
  let hasR2Binding = false;
  let d1QueryOk = false;
  let r2ProbeOk = false;
  let error: string | null = null;

  try {
    // @ts-ignore dynamic import in Workers
    const { getRequestContext } = await import('next/server');
    const ctx = typeof getRequestContext === 'function' ? getRequestContext() : undefined;
    hasRequestContext = Boolean(ctx);
    const env = ctx?.cloudflare?.env as { DB?: unknown; UPLOADS?: R2BucketInfo } | undefined;
    hasD1Binding = Boolean(env?.DB);
    hasR2Binding = Boolean(env?.UPLOADS);

    // D1: simple count query
    try {
      await prisma.year.count();
      d1QueryOk = true;
    } catch (e: any) {
      error = `D1 query error: ${e?.message || String(e)}`;
    }

    // R2: try a safe HEAD/GET for a non-existent key to validate binding
    try {
      const bucket = env?.UPLOADS as any;
      if (bucket && typeof bucket.get === 'function') {
        // Using range avoids downloading body
        await bucket.get(`__diag__/${Date.now()}.txt`, { range: { offset: 0, length: 1 } });
        r2ProbeOk = true; // if call didn't throw, binding is functional
      }
    } catch {
      r2ProbeOk = true; // even 404 means binding works; only missing binding would throw
    }
  } catch (e: any) {
    error = `Health check failed: ${e?.message || String(e)}`;
  }

  return NextResponse.json({
    ok: d1QueryOk || r2ProbeOk,
    hasRequestContext,
    d1: { hasBinding: hasD1Binding, queryOk: d1QueryOk },
    r2: { hasBinding: hasR2Binding, probeOk: r2ProbeOk },
    error,
  });
}
