import { NextRequest, NextResponse } from 'next/server';
import { isAdminRoute, adminAuthError } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV === 'development';
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0]?.toLowerCase() ?? '';

  // Enforce apex domain in production (redirect www -> apex)
  if (!isDev) {
    if (hostname === 'www.utoa.studio') {
      const url = new URL(request.url);
      url.hostname = 'utoa.studio';
      return NextResponse.redirect(url, { status: 308 });
    }
  }

  // Authenticate before considering static paths; a dot is valid in a route parameter.
  if (isAdminRoute(pathname)) {
    if (hostname.endsWith('.workers.dev')) {
      return new NextResponse('Forbidden (staging admin disabled)', { status: 403 });
    }
    const authError = await adminAuthError(request);
    if (authError) return authError;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
