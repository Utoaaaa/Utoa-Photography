import { NextRequest, NextResponse } from 'next/server';

import { isAuthenticated } from '@/lib/auth';
import { GET as baseGET, POST as basePOST } from '@/app/api/years/[year_id]/collections/route';

type AdminParams = { params: Promise<{ yearId: string }> };

export const dynamic = 'force-dynamic';

function toSharedContext(context: AdminParams) {
  return Promise.resolve(context.params).then((resolved) => ({
    params: Promise.resolve({ year_id: resolved.yearId }),
  }));
}

export async function GET(request: NextRequest, context: AdminParams) {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 },
    );
  }

  const shared = await toSharedContext(context);
  return baseGET(request, shared as Parameters<typeof baseGET>[1]);
}

export async function POST(request: NextRequest, context: AdminParams) {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 },
    );
  }

  const shared = await toSharedContext(context);
  return basePOST(request, shared as Parameters<typeof basePOST>[1]);
}
