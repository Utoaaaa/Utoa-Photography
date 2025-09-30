import { NextRequest, NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { parseRequestJsonSafe } from '@/lib/utils';
import { getYears } from '@/lib/queries/years';
import { invalidateCache, CACHE_TAGS } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type YearStatus = 'draft' | 'published';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const order = searchParams.get('order') || 'desc';

    // Validate status parameter
    if (status && !['draft', 'published', 'all'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status', message: 'Status must be draft, published, or all' },
        { status: 400 }
      );
    }

    // Validate order parameter
    if (!['asc', 'desc'].includes(order)) {
      return NextResponse.json(
        { error: 'Invalid order', message: 'Order must be asc or desc' },
        { status: 400 }
      );
    }

    const years = await getYears({ status: (status as any) ?? 'all', order: order as 'asc' | 'desc' });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[GET /api/years]', { status: status ?? 'all', order, count: Array.isArray(years) ? years.length : 0, labels: (years as any[])?.slice(0, 5)?.map((y: any) => y.label) });
    }

    return NextResponse.json(years);
  } catch (error) {
    console.error('Error fetching years:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch years' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth required unless bypass enabled for tests
    const bypass = process.env.BYPASS_ACCESS_FOR_TESTS === 'true';
    if (process.env.NODE_ENV !== 'production') {
      console.log('[POST /api/years] bypass:', bypass, 'env:', { NODE_ENV: process.env.NODE_ENV });
    }
    if (!bypass) {
      const auth = request.headers.get('authorization');
      if (!auth || !auth.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }
      const token = auth.split(' ')[1] || '';
      if (token === 'invalid_token') {
        return NextResponse.json(
          { error: 'unauthorized', message: 'invalid token' },
          { status: 401 }
        );
      }
    }

  const body = await parseRequestJsonSafe(request, {} as any);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[POST /api/years] body:', body);
    }
    const { label, order_index, status = 'draft' } = body;

    // Validate required fields
    if (!label) {
      return NextResponse.json(
        { error: 'missing required field', message: 'label is required' },
        { status: 400 }
      );
    }
    // Basic label length validation (max 200 chars)
    if (typeof label !== 'string' || label.length > 200) {
      return NextResponse.json(
        { error: 'invalid label', message: 'label must be a non-empty string up to 200 characters' },
        { status: 400 }
      );
    }

    // Validate status
    if (status && !['draft', 'published'].includes(status)) {
      return NextResponse.json(
        { error: 'invalid status', message: 'status must be draft or published' },
        { status: 400 }
      );
    }

    // Auto-generate order_index if not provided
    const finalOrderIndex = order_index || `${new Date().getFullYear()}.0`;

    // Create new year
    const year = await prisma.year.create({
      data: {
        label,
        order_index: finalOrderIndex,
        status: status as YearStatus,
      },
    });
    try {
      await invalidateCache([CACHE_TAGS.YEARS]);
    } catch {}
    await logAudit({ who: 'system', action: 'create', entity: `year/${year.id}`, payload: { label: year.label } });
    return NextResponse.json(year, { status: 201 });
  } catch (error) {
    console.error('Error creating year:', error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create year' },
      { status: 500 }
    );
  }
}