import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface CloudflareAccessUser {
  sub: string;
  email: string;
  name?: string;
  aud: string[];
  iss: string;
  iat: number;
  exp: number;
}

export class AuthError extends Error {
  constructor(public readonly status: 401 | 403 | 503, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export function isAdminRoute(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/')
    || pathname === '/api/admin' || pathname.startsWith('/api/admin/');
}

let keySet: { issuer: string; resolve: ReturnType<typeof createRemoteJWKSet> } | undefined;

function accessConfiguration() {
  const domain = process.env.CF_ACCESS_TEAM_DOMAIN?.trim();
  const audience = process.env.CF_ACCESS_AUD?.trim();
  if (!domain || !audience) throw new AuthError(503, 'Authentication unavailable');
  let issuer: string;
  try {
    const url = new URL(domain);
    // Only operator-configured Cloudflare keys. Never follow a JWT's jku/iss URL.
    if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(url.hostname)
      || url.port || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error('Invalid issuer');
    }
    issuer = url.origin;
  } catch {
    throw new AuthError(503, 'Authentication unavailable');
  }
  if (!keySet || keySet.issuer !== issuer) {
    keySet = {
      issuer,
      resolve: createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`), {
        timeoutDuration: 5000,
        cooldownDuration: 30000,
        cacheMaxAge: 600000,
      }),
    };
  }
  return { issuer, audience, keys: keySet.resolve };
}

function accessToken(request: NextRequest): string | null {
  // Cloudflare browser assertions and cloudflared CLI tokens use the same verification.
  // An invalid higher-priority credential never falls back to another identity.
  const assertion = request.headers.get('cf-access-jwt-assertion');
  if (assertion !== null) return assertion;
  const cliToken = request.headers.get('cf-access-token');
  if (cliToken !== null) return cliToken;
  const authorization = request.headers.get('authorization');
  return authorization?.match(/^Bearer (\S+)$/i)?.[1] ?? null;
}

export async function requireAuth(request: NextRequest): Promise<CloudflareAccessUser> {
  const token = accessToken(request);
  if (!token || token.length > 16384 || token.split('.').length !== 3) {
    throw new AuthError(401, 'Authentication required');
  }
  const { issuer, audience, keys } = accessConfiguration();
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience,
      algorithms: ['RS256'],
      requiredClaims: ['sub', 'email', 'iat', 'exp', 'iss', 'aud'],
    });
    if (typeof payload.sub !== 'string' || !payload.sub.trim()
      || typeof payload.email !== 'string' || !payload.email.trim()
      || typeof payload.iat !== 'number' || !Number.isFinite(payload.iat)
      || payload.iat > Math.floor(Date.now() / 1000)
      || typeof payload.exp !== 'number' || payload.exp <= payload.iat) {
      throw new Error('Invalid identity claims');
    }
    return {
      sub: payload.sub,
      email: payload.email.trim().toLowerCase(),
      ...(typeof payload.name === 'string' ? { name: payload.name } : {}),
      aud: Array.isArray(payload.aud) ? payload.aud : [payload.aud as string],
      iss: payload.iss as string,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    // Do not log tokens or expose verifier/network details to the caller.
    throw new AuthError(401, 'Invalid or expired authentication');
  }
}

export async function extractUserFromHeaders(request: NextRequest): Promise<CloudflareAccessUser | null> {
  try { return await requireAuth(request); } catch { return null; }
}

export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  return (await extractUserFromHeaders(request)) !== null;
}

export function isAuthorizedAdmin(email: string): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? '').split(',')
    .map(value => value.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}

export async function requireAdminAuth(request: NextRequest): Promise<CloudflareAccessUser> {
  const user = await requireAuth(request);
  if (!isAuthorizedAdmin(user.email)) throw new AuthError(403, 'Admin access required');
  return user;
}

/** Call before parsing the body, resolving params, or accessing data in every protected handler. */
export async function adminAuthError(request: NextRequest): Promise<NextResponse | null> {
  try {
    await requireAdminAuth(request);
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const origin = request.headers.get('origin');
      if ((origin !== null && origin !== new URL(request.url).origin)
        || request.headers.get('sec-fetch-site') === 'cross-site') {
        throw new AuthError(403, 'Cross-origin request forbidden');
      }
    }
    return null;
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 503;
    return NextResponse.json(
      { error: status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Authentication unavailable' },
      { status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
