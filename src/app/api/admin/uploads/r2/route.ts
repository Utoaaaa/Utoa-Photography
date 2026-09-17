import { adminAuthError } from '@/lib/auth';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const authError = await adminAuthError(request);
  if (authError) return authError;

  const mod = await import('@/lib/api-handlers/r2-upload');
  return mod.POST(request);
}
