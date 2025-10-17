import { NextRequest, NextResponse } from 'next/server';
import { isAdminRoute, isAuthenticated } from './src/lib/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV === 'development';
  const bypass = isDev && process.env.BYPASS_ACCESS_FOR_TESTS === 'true';
  const host = request.headers.get('host') || '';

  // Enforce apex domain in production (redirect www -> apex)
  if (!isDev) {
    if (host.startsWith('www.utoa.studio')) {
      const url = new URL(request.url);
      url.hostname = 'utoa.studio';
      return NextResponse.redirect(url, { status: 308 });
    }
  }
  
  // Skip middleware for static files and API routes that don't need auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/images/direct-upload') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }
  
  // Check authentication for admin routes
  if (isAdminRoute(pathname)) {
    // Never expose admin over workers.dev staging host
    if (host.endsWith('.workers.dev')) {
      return new NextResponse('Forbidden (staging admin disabled)', { status: 403 });
    }
    // In development, allow access without auth (optional bypass)
    if (isDev || bypass) {
      return NextResponse.next();
    }
    
    // In production, check Cloudflare Access headers
    if (!isAuthenticated(request)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
