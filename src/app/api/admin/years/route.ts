import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  const mod = await import('@/app/api/years/route');
  return mod.GET(request);
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const label: string | undefined = body.label;
    const order_index: string | undefined = body.order_index;
    const status: string | undefined = body.status || 'draft';

    if (!label || typeof label !== 'string' || label.length > 200) {
      return NextResponse.json({ error: 'invalid label' }, { status: 400 });
    }
    if (!['draft', 'published'].includes(status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    }

    const finalOrderIndex = order_index || `${new Date().getFullYear()}.0`;
    const id = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10)) as string;
    const now = new Date().toISOString();

    const { getRequestContext } = await import('next/server');
    const ctx = getRequestContext?.();
    const db: any = ctx?.cloudflare?.env?.DB;
    if (!db) {
      return NextResponse.json({ error: 'D1 binding missing' }, { status: 500 });
    }

    await db
      .prepare(
        'INSERT INTO years (id, label, order_index, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
      )
      .bind(id, label, finalOrderIndex, status, now, now)
      .run();

    const row = await db
      .prepare('SELECT id, label, order_index, status, created_at, updated_at FROM years WHERE id = ?1')
      .bind(id)
      .first();

    return NextResponse.json(row ?? { id, label, order_index: finalOrderIndex, status }, { status: 201 });
  } catch (e: any) {
    console.error('[admin/years] POST failed', e);
    return NextResponse.json({ error: 'internal error', message: String(e?.message || e) }, { status: 500 });
  }
}
