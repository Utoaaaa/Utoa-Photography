import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import {
  POST as PublicPOST,
  PUT as PublicPUT,
} from '@/app/api/collections/[collection_id]/assets/route';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ collection_id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  return PublicPOST(request, context as any);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ collection_id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  return PublicPUT(request, context as any);
}

