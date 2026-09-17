import { adminAuthError } from '@/lib/auth';
import { NextRequest } from 'next/server';

import { GET as baseGET, POST as basePOST } from '@/lib/api-handlers/year-collections';

type AdminParams = { params: Promise<{ yearId: string }> };

export const dynamic = 'force-dynamic';

function toSharedContext(context: AdminParams) {
  return Promise.resolve(context.params).then((resolved) => ({
    params: Promise.resolve({ year_id: resolved.yearId }),
  }));
}

export async function GET(request: NextRequest, context: AdminParams) {
  const authError = await adminAuthError(request);
  if (authError) return authError;


  const shared = await toSharedContext(context);
  return baseGET(request, shared as Parameters<typeof baseGET>[1]);
}

export async function POST(request: NextRequest, context: AdminParams) {
  const authError = await adminAuthError(request);
  if (authError) return authError;


  const shared = await toSharedContext(context);
  return basePOST(request, shared as Parameters<typeof basePOST>[1]);
}
