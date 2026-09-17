import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';

const equal = (a, b) => typeof a === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b)
  && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// This gateway never listens on LAN and never forwards to a remote server.
export function createAdminProxy({ upstreamPort, token, expiresAt, port = 3020 }) {
  if (![port, upstreamPort].every(p => Number.isInteger(p) && p > 0 && p < 65536)) throw Error('Invalid port');
  const origin = `http://127.0.0.1:${port}`;
  const upstreamOrigin = `http://127.0.0.1:${upstreamPort}`;
  const bootstrap = randomBytes(32).toString('hex');
  let session = randomBytes(32).toString('hex');
  let used = false;
  const server = http.createServer((req, res) => {
    const fail = (status, text) => { res.writeHead(status, { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain' }); res.end(text); };
    if (req.headers.host !== `127.0.0.1:${port}` || !['127.0.0.1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return fail(403, 'Local access only');
    if (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) return fail(403, 'Cross-site access denied');
    if (req.headers.origin && req.headers.origin !== origin) return fail(403, 'Invalid origin');
    if (!req.url?.startsWith('/') || req.url.startsWith('//')) return fail(400, 'Invalid path');
    const url = new URL(req.url, origin);
    if (url.pathname === '/__local/login' && req.method === 'GET') {
      const nonce = randomBytes(16).toString('hex');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'` });
      return res.end(`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>本機後台登入</title><p id="status">正在驗證本機登入…</p><script nonce="${nonce}">const key=location.hash.slice(1);history.replaceState(null,'','/__local/login');fetch('/__local/session',{method:'POST',headers:{'Content-Type':'text/plain'},body:key}).then(r=>{if(r.ok)location.replace('/admin');else document.getElementById('status').textContent='登入連結已失效，請重新執行 npm run dev:admin';});</script></html>`);
    }
    if (url.pathname === '/__local/session' && req.method === 'POST') {
      if (req.headers.origin !== origin || used || Date.now() >= expiresAt) return fail(403, 'Invalid session request');
      let body = '';
      req.on('data', chunk => { body += chunk; if (body.length > 128) req.destroy(); });
      req.on('end', () => {
        if (!equal(body, bootstrap)) return fail(403, 'Invalid login');
        used = true;
        res.writeHead(204, { 'Cache-Control': 'no-store', 'Set-Cookie': `utoa_local=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.max(0, Math.floor((expiresAt-Date.now())/1000))}` });
        res.end();
      });
      return;
    }
    const cookie = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('utoa_local='))?.slice(11);
    if (!used || !equal(cookie, session) || Date.now() >= expiresAt) return fail(401, '請重新執行 npm run dev:admin 登入。');
    if (url.pathname === '/__local/logout' && req.method === 'POST') {
      if (req.headers.origin !== origin) return fail(403, 'Invalid origin');
      session = randomBytes(32).toString('hex');
      res.writeHead(204, { 'Set-Cookie': 'utoa_local=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0', 'Cache-Control': 'no-store' });
      return res.end();
    }
    const headers = { ...req.headers, host: `127.0.0.1:${upstreamPort}` };
    for (const name of Object.keys(headers)) if (name.startsWith('cf-') || name.startsWith('x-forwarded-') || ['authorization','forwarded','connection','proxy-authorization'].includes(name)) delete headers[name];
    headers.cookie = (req.headers.cookie || '').split(';').filter(v => !v.trim().startsWith('utoa_local=')).join(';');
    headers['cf-access-jwt-assertion'] = token;
    if (headers.origin) headers.origin = upstreamOrigin;
    const proxy = http.request({ host: '127.0.0.1', port: upstreamPort, method: req.method, path: req.url, headers }, response => {
      const out = { ...response.headers, 'cache-control': 'no-store' };
      if (out.location?.startsWith(upstreamOrigin + '/')) out.location = origin + out.location.slice(upstreamOrigin.length);
      res.writeHead(response.statusCode, out); response.pipe(res);
    });
    proxy.on('error', () => { if (!res.headersSent) fail(502, '本機 Next.js 尚未就緒。'); else res.destroy(); });
    req.on('aborted', () => proxy.destroy());
    req.pipe(proxy);
  });
  // Do not expose an unauthenticated upgrade tunnel.
  server.on('upgrade', (_req, socket) => socket.destroy());
  return { server, origin, loginUrl: `${origin}/__local/login#${bootstrap}` };
}
