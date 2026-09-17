import { adminAuthError } from '@/lib/auth';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const error = await adminAuthError(request);
  if (error) return error;
  const handler = await import('@/lib/api-handlers/revalidate');
  return handler.POST(request);
}
