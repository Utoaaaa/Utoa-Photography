import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import {
  GET as PublicGET,
  POST as PublicPOST,
} from '@/app/api/years/[year_id]/collections/route';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ year_id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  return PublicGET(request, context as any);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ year_id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  return PublicPOST(request, context as any);
}

