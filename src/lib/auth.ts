import { NextRequest } from 'next/server';

export interface CloudflareAccessUser {
  sub: string;
  email: string;
  name?: string;
  aud: string[];
  iss: string;
  iat: number;
  exp: number;
}

export function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
}

export function getCloudflareAccessHeaders(request: NextRequest): Record<string, string> {
  return {
    'Cf-Access-Authenticated-User-Email': request.headers.get('cf-access-authenticated-user-email') || '',
    'Cf-Access-Jwt-Assertion': request.headers.get('cf-access-jwt-assertion') || '',
  };
}

export function extractUserFromHeaders(request: NextRequest): CloudflareAccessUser | null {
  try {
    if (process.env.NODE_ENV === 'test' || process.env.BYPASS_ACCESS_FOR_TESTS === 'true') {
      return {
        sub: 'test-user',
        email: 'test@local',
        name: 'test',
        aud: ['admin'],
        iss: 'bypass',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
    }

    const email = request.headers.get('cf-access-authenticated-user-email');
    const jwtAssertion = request.headers.get('cf-access-jwt-assertion');

    // Relaxed: accept presence of email header as authenticated.
    // Cloudflare typically injects both, but some setups may omit the JWT.
    if (!email) {
      return null;
    }

    // In production, you would validate the JWT assertion
    // For now, we'll create a basic user object
    return {
      sub: email,
      email,
      name: email.split('@')[0],
      aud: ['admin'],
      iss: jwtAssertion ? 'cloudflare-access(jwt)' : 'cloudflare-access',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
  } catch (error) {
    console.error('Error extracting user from headers:', error);
    return null;
  }
}

export function isAuthenticated(request: NextRequest): boolean {
  const user = extractUserFromHeaders(request);
  return user !== null;
}

export function requireAuth(request: NextRequest): CloudflareAccessUser {
  const user = extractUserFromHeaders(request);
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

// Admin email whitelist for additional security
const ADMIN_EMAILS = typeof process !== 'undefined' && process.env && typeof process.env.ADMIN_EMAILS === 'string'
  ? (process.env.ADMIN_EMAILS as string).split(',')
  : [];

export function isAuthorizedAdmin(email: string): boolean {
  if (ADMIN_EMAILS.length === 0) {
    // If no admin emails are configured, allow access for development/testing only
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') return true;
    return process.env.NODE_ENV !== 'production' && process.env.BYPASS_ACCESS_FOR_TESTS === 'true';
  }
  return ADMIN_EMAILS.includes(email);
}

export function requireAdminAuth(request: NextRequest): CloudflareAccessUser {
  const user = requireAuth(request);
  
  if (!isAuthorizedAdmin(user.email)) {
    throw new Error('Admin access required');
  }
  
  return user;
}
