import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import {
  GET as PublicGET,
  PUT as PublicPUT,
  DELETE as PublicDELETE,
} from '@/app/api/collections/[collection_id]/route';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ collection_id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  return PublicGET(request, context as any);
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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ collection_id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }
  return PublicDELETE(request, context as any);
}

