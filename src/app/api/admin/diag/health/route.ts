import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getCloudflareEnv } from '@/lib/cloudflare';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }

  let hasD1Binding = false;
  let hasR2Binding = false;
  let d1QueryOk = false;
  let r2ProbeOk = false;
  let error: string | null = null;

  try {
    const env = getCloudflareEnv();
    hasD1Binding = Boolean(env?.DB);
    hasR2Binding = Boolean(env?.UPLOADS);

    try {
      if (env?.DB) {
        await env.DB.prepare('SELECT 1 as x').first();
        d1QueryOk = true;
      }
    } catch (e: any) {
      error = `D1 query error: ${e?.message || String(e)}`;
    }

    try {
      const bucket = env?.UPLOADS as any;
      if (bucket) {
        const key = `__health/${Date.now()}.txt`;
        await bucket.put(key, 'ok');
        if (typeof bucket.head === 'function') {
          const head = await bucket.head(key);
          r2ProbeOk = !!head;
        } else {
          // Some bindings may not expose head; a successful put is enough
          r2ProbeOk = true;
        }
      }
    } catch (e: any) {
      error = error ?? `R2 probe error: ${e?.message || String(e)}`;
    }
  } catch (e: any) {
    error = `Health check failed: ${e?.message || String(e)}`;
  }

  return NextResponse.json({
    ok: d1QueryOk || r2ProbeOk,
    d1: { hasBinding: hasD1Binding, queryOk: d1QueryOk },
    r2: { hasBinding: hasR2Binding, probeOk: r2ProbeOk },
    error,
  }, { status: (d1QueryOk || r2ProbeOk) ? 200 : 500 });
}
