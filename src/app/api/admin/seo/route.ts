import { NextRequest, NextResponse } from 'next/server';
import { adminAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const authError = await adminAuthError(request);
  if (authError) return authError;
  try {
    const { listSEOTargets } = await import('@/lib/seo/store');
    return NextResponse.json({ targets: await listSEOTargets() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Failed to list SEO targets', error);
    return NextResponse.json({ error: '無法載入 SEO 頁面列表。' }, { status: 500 });
  }
}
