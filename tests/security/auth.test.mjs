import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import * as jose from 'jose';
import { sourceLoader, routeFiles } from './source-loader.mjs';

const require = createRequire(import.meta.url);
const { NextRequest } = require('next/server');
const issuer = 'https://security-fixture.cloudflareaccess.com';
const audience = 'security-test-application';
const admin = 'admin@example.invalid';
const pair = await jose.generateKeyPair('RS256');
const otherPair = await jose.generateKeyPair('RS256');
const jwk = { ...await jose.exportJWK(pair.publicKey), kid: 'fixture-key', alg: 'RS256', use: 'sig' };
const now = Math.floor(Date.now() / 1000);
const env = {
  NODE_ENV: 'production', CF_ACCESS_TEAM_DOMAIN: issuer, CF_ACCESS_AUD: audience,
  ADMIN_EMAILS: ` ${admin.toUpperCase()} , second@example.invalid `,
  // Neither flag may affect production authentication.
  BYPASS_ACCESS_FOR_TESTS: 'true',
};
async function token(claims = {}, privateKey = pair.privateKey, header = {}) {
  return new jose.SignJWT({ sub: 'fixture-user', email: admin, iss: issuer, aud: [audience], iat: now, exp: now + 3600, ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: jwk.kid, ...header }).sign(privateKey);
}
const adminToken = await token();
const nonAdminToken = await token({ email: 'visitor@example.invalid' });
const badSignature = await token({}, otherPair.privateKey);
let jwksRequests = 0;
const realVerifierWithOfflineKeys = {
  ...jose,
  createRemoteJWKSet(url, options) {
    assert.equal(url.href, `${issuer}/cdn-cgi/access/certs`);
    return jose.createRemoteJWKSet(url, {
      ...options,
      [jose.customFetch]: async requested => {
        jwksRequests++;
        assert.equal(String(requested), `${issuer}/cdn-cgi/access/certs`);
        return Response.json({ keys: [jwk] });
      },
    });
  },
};
function fixture(customEnv = {}) {
  const effects = [];
  const settings = { ...env, ...customEnv };
  const load = sourceLoader({ env: settings, jose: realVerifierWithOfflineKeys, effects });
  return { load, effects, settings, auth: load('src/lib/auth.ts') };
}
const header = jwt => ({ 'cf-access-jwt-assertion': jwt });
function request(headers = {}, method = 'POST', pathname = '/api/years') {
  return new NextRequest(`https://utoa.studio${pathname}`, { method, headers });
}

for (const [label, headers, status] of [
  ['anonymous', {}, 401],
  ['forged email', { 'cf-access-authenticated-user-email': admin }, 401],
  ['arbitrary bearer', { authorization: 'Bearer arbitrary' }, 401],
  ['legacy invalid token', { authorization: 'Bearer invalid_token' }, 401],
  ['missing-secret literal', { authorization: 'Bearer undefined' }, 401],
  ['arbitrary CLI token', { 'cf-access-token': 'arbitrary' }, 401],
  ['wrong signature', header(badSignature), 401],
  ['wrong issuer', header(await token({ iss: 'https://attacker.cloudflareaccess.com' })), 401],
  ['wrong audience', header(await token({ aud: ['other-app'] })), 401],
  ['expired', header(await token({ iat: now - 3600, exp: now - 1 })), 401],
  ['not yet valid', header(await token({ nbf: now + 3600 })), 401],
  ['future issued-at', header(await token({ iat: now + 60 })), 401],
  ['missing expiration', header(await token({ exp: undefined })), 401],
  ['missing issued-at', header(await token({ iat: undefined })), 401],
  ['missing email', header(await token({ email: undefined })), 401],
  ['non-admin signed token', header(nonAdminToken), 403],
  ['non-admin with forged admin header', { ...header(nonAdminToken), 'cf-access-authenticated-user-email': admin }, 403],
  ['bad assertion cannot fall back to good CLI token', { ...header('bad'), 'cf-access-token': adminToken }, 401],
]) {
  test(`authentication rejects ${label}`, async () => {
    const { auth, effects } = fixture();
    const result = await auth.adminAuthError(request(headers));
    assert.equal(result.status, status);
    assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.deepEqual(effects, []);
  });
}

test('unsigned alg none JWT is rejected', async () => {
  const jwt = `${Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')}.${Buffer.from(JSON.stringify({ email: admin, iss: issuer, aud: audience, exp: now + 3600 })).toString('base64url')}.`;
  assert.equal((await fixture().auth.adminAuthError(request(header(jwt)))).status, 401);
});

test('HS256 token cannot substitute for an RSA signature', async () => {
  const jwt = await new jose.SignJWT({ sub: 'fake', email: admin, iss: issuer, aud: audience, iat: now, exp: now + 3600 })
    .setProtectedHeader({ alg: 'HS256', kid: jwk.kid }).sign(new TextEncoder().encode('fake-secret-at-least-32-characters'));
  assert.equal((await fixture().auth.adminAuthError(request(header(jwt)))).status, 401);
});

for (const credentials of [header(adminToken), { 'cf-access-token': adminToken }, { authorization: `Bearer ${adminToken}` }]) {
  test(`signed administrator accepted through ${Object.keys(credentials)[0]}`, async () => {
    const { auth } = fixture();
    assert.equal(await auth.adminAuthError(request(credentials)), null);
    const user = await auth.requireAdminAuth(request(credentials));
    assert.equal(user.email, admin);
    assert.equal(user.iss, issuer);
  });
}

for (const [label, config, status] of [
  ['missing issuer', { CF_ACCESS_TEAM_DOMAIN: '' }, 503],
  ['missing audience', { CF_ACCESS_AUD: '' }, 503],
  ['non-Cloudflare issuer', { CF_ACCESS_TEAM_DOMAIN: 'https://attacker.invalid' }, 503],
  ['insecure issuer', { CF_ACCESS_TEAM_DOMAIN: 'http://security-fixture.cloudflareaccess.com' }, 503],
  ['issuer path', { CF_ACCESS_TEAM_DOMAIN: issuer + '/evil' }, 503],
  ['empty admin whitelist', { ADMIN_EMAILS: '' }, 403],
]) {
  test(`configuration fails closed: ${label}`, async () => {
    assert.equal((await fixture(config).auth.adminAuthError(request(header(adminToken)))).status, status);
  });
}

for (const mode of ['production', 'development', 'test']) {
  test(`no automatic authentication bypass in ${mode}`, async () => {
    assert.equal((await fixture({ NODE_ENV: mode }).auth.adminAuthError(request())).status, 401);
  });
}

test('JWKS failure fails closed and does not expose infrastructure errors', async () => {
  const load = sourceLoader({ env, jose: { ...jose, createRemoteJWKSet: () => async () => { throw Error('private-network-error'); } } });
  const result = await load('src/lib/auth.ts').adminAuthError(request(header(adminToken)));
  assert.equal(result.status, 401);
  assert.equal((await result.text()).includes('private-network-error'), false);
});

test('JWKS resolver caches verified public keys between requests', async () => {
  const { auth } = fixture();
  const before = jwksRequests;
  await auth.requireAdminAuth(request(header(adminToken)));
  await auth.requireAdminAuth(request(header(adminToken)));
  assert.equal(jwksRequests - before, 1);
});

for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
  test(`${method} rejects cross-origin browser writes with a valid administrator`, async () => {
    const { auth } = fixture();
    assert.equal((await auth.adminAuthError(request({ ...header(adminToken), origin: 'https://evil.invalid' }, method))).status, 403);
    assert.equal((await auth.adminAuthError(request({ ...header(adminToken), origin: 'null' }, method))).status, 403);
    assert.equal((await auth.adminAuthError(request({ ...header(adminToken), 'sec-fetch-site': 'cross-site' }, method))).status, 403);
    assert.equal(await auth.adminAuthError(request({ ...header(adminToken), origin: 'https://utoa.studio' }, method)), null);
  });
}

const retired = require('./retired-write-routes.json');
const matrix = fixture();
const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
let writes = 0;
for (const file of routeFiles()) {
  const pathname = '/' + file.slice(file.indexOf('/api/') + 1).replace(/\/route.ts$/, '').replace(/\[[^\]]+\]/g, '11111111-1111-4111-8111-111111111111');
  const mod = matrix.load(file);
  for (const method of methods) {
    if (typeof mod[method] !== 'function') continue;
    const isWrite = method !== 'GET';
    const protectedRead = /^\/api\/(admin|assets|audit|uploads)(\/|$)/.test(pathname);
    if (!isWrite && !protectedRead) continue;
    if (isWrite) writes++;
    for (const [name, headers, expected] of [
      ['anonymous', {}, 401],
      ['fake token', { authorization: 'Bearer arbitrary' }, 401],
      ['forged email', { 'cf-access-authenticated-user-email': admin }, 401],
      ['forged signature', header(badSignature), 401],
      ['non-admin', header(nonAdminToken), 403],
    ]) {
      test(`${method} ${pathname} rejects ${name} before any side effects`, async () => {
        matrix.effects.length = 0;
        const req = request(headers, method, pathname);
        for (const reader of ['json', 'text', 'formData', 'arrayBuffer']) {
          req[reader] = () => { matrix.effects.push(`body.${reader}`); throw Error('body must not be read'); };
        }
        const context = { params: { then() { matrix.effects.push('params'); throw Error('params must not be resolved'); } } };
        const res = await mod[method](req, context);
        assert.equal(res.status, isWrite && !pathname.startsWith('/api/admin/') ? 405 : expected);
        assert.deepEqual(matrix.effects, []);
      });
    }
  }
}
test('write route discovery includes the complete current inventory', () => {
  // Automatically tests new exports too; a lower count detects lost discovery.
  assert.ok(writes >= 40, `Only ${writes} write handlers discovered`);
});

for (const pathname of ['/admin', '/admin/example.html', '/api/admin/years/2026.0/locations']) {
  test(`middleware protects ${pathname}`, async () => {
    const { load } = fixture();
    const middleware = load('src/middleware.ts').middleware;
    assert.equal((await middleware(request({}, 'GET', pathname))).status, 401);
    assert.equal((await middleware(request(header(nonAdminToken), 'GET', pathname))).status, 403);
    assert.equal((await middleware(request(header(adminToken), 'GET', pathname))).status, 200);
  });
}

test('middleware keeps public pages available and staging admin disabled', async () => {
  const middleware = fixture().load('src/middleware.ts').middleware;
  assert.equal((await middleware(request({}, 'GET', '/'))).status, 200);
  const staging = new NextRequest('https://example.workers.dev/admin', { headers: { ...header(adminToken), host: 'example.workers.dev' } });
  assert.equal((await middleware(staging)).status, 403);
});

test('verified administrator can create a year through the admin API', async () => {
  const writes = [];
  const load = sourceLoader({ env, jose: realVerifierWithOfflineKeys, overrides: {
    '@/lib/d1-queries': {
      shouldUseD1Direct: () => true,
      d1CreateYear: async data => { writes.push(data); return { id: 'fixture-year', ...data }; },
      d1CreateAuditLog: async () => {},
    },
    '@/lib/cache': { invalidateCache: async () => {}, CACHE_TAGS: { YEARS: 'years' } },
  } });
  const req = new NextRequest('https://utoa.studio/api/admin/years', {
    method: 'POST', headers: { ...header(adminToken), 'content-type': 'application/json', origin: 'https://utoa.studio' },
    body: JSON.stringify({ label: '2030', status: 'draft' }),
  });
  const res = await load('src/app/api/admin/years/route.ts').POST(req);
  assert.equal(res.status, 201);
  assert.equal((await res.json()).label, '2030');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].label, '2030');
});

test('signed CLI user can upload through admin alias with the shared handler', async () => {
  const writes = [];
  const load = sourceLoader({ env, jose: realVerifierWithOfflineKeys, overrides: {
    '@/lib/cloudflare': { getR2Bucket: () => ({ put: async (key, body, metadata) => { writes.push({ key, metadata }); } }) },
  } });
  const body = new FormData();
  body.append('file', new File([new Uint8Array([0xff, 0xd8, 0xff])], 'test.jpg', { type: 'image/jpeg' }));
  const req = new NextRequest('https://utoa.studio/api/admin/uploads/r2?variant=thumb&image_id=test-image', {
    method: 'POST', headers: { 'cf-access-token': adminToken }, body,
  });
  const res = await load('src/app/api/admin/uploads/r2/route.ts').POST(req);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).image_id, 'test-image');
  assert.equal(writes.length, 1);
});

test('revalidate requires an administrator JWT even if a legacy secret is configured', async () => {
  let calls = 0;
  const load = sourceLoader({ env: { ...env, REVALIDATE_SECRET: 'legacy-secret' }, jose: realVerifierWithOfflineKeys, overrides: {
    '@/lib/cache': { revalidateTagsWithRetry: async tags => { calls++; return { success: tags, failed: [] }; } },
  } });
  const handler = load('src/app/api/admin/revalidate/route.ts').POST;
  const legacy = await handler(request({ authorization: 'Bearer legacy-secret' }, 'POST', '/api/admin/revalidate'));
  assert.equal(legacy.status, 401);
  assert.equal(calls, 0);
  const valid = new NextRequest('https://utoa.studio/api/admin/revalidate', {
    method: 'POST', headers: { ...header(adminToken), 'content-type': 'application/json' },
    body: JSON.stringify({ tags: ['homepage'] }),
  });
  assert.equal((await handler(valid)).status, 200);
  assert.equal(calls, 1);
});

for (const entry of retired) {
  for (const method of entry.methods) {
    test(`retired ${method} ${entry.route} rejects even a valid admin without side effects`, async () => {
      const { load, effects } = fixture();
      const req = request(header(adminToken), method, entry.route);
      req.json = () => { throw Error('Retired writes must not read a body'); };
      const response = await load(`src/app${entry.route}/route.ts`)[method](req);
      assert.equal(response.status, 405);
      assert.equal(response.headers.get('allow'), entry.getPreserved ? 'GET, HEAD, OPTIONS' : 'OPTIONS');
      assert.equal(response.headers.get('location'), null);
      const options = await load(`src/app${entry.route}/route.ts`).OPTIONS();
      assert.equal(options.status, 204);
      assert.equal(options.headers.get('allow'), response.headers.get('allow'));
      assert.ok(!options.headers.get('allow').includes(method));
      assert.deepEqual(effects, []);
    });
  }
  if (entry.getPreserved) {
    test(`GET ${entry.route} retains its original handler`, () => {
      const { load } = fixture();
      assert.equal(load(`src/app${entry.route}/route.ts`).GET, load(`src/lib/api-handlers/${entry.handler}.ts`).GET);
    });
  }
}
test('public years GET remains anonymous while admin GET requires identity', async () => {
  const rows = [{ id: 'fixture', label: '2024', status: 'published' }];
  const load = sourceLoader({ env, jose: realVerifierWithOfflineKeys, overrides: {
    '@/lib/d1-queries': { shouldUseD1Direct: () => true, d1GetYears: async () => rows },
  } });
  const publicResult = await load('src/app/api/years/route.ts').GET(request({}, 'GET', '/api/years'));
  assert.equal(publicResult.status, 200);
  assert.deepEqual(await publicResult.json(), rows);
  assert.equal((await load('src/app/api/admin/years/route.ts').GET(request({}, 'GET', '/api/admin/years'))).status, 401);
});
