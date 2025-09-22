import { NextRequest, NextResponse } from 'next/server';
import { isAdminRoute, isAuthenticated } from './src/lib/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const bypass = process.env.BYPASS_ACCESS_FOR_TESTS === 'true';
  
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
    // In development, allow access without auth
    if (process.env.NODE_ENV === 'development' || bypass) {
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