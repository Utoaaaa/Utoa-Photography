import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import nextEnv from '@next/env';
import { createAdminProxy } from './local-admin-proxy.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
nextEnv.loadEnvConfig(root, true);
const issuer = process.env.CF_ACCESS_TEAM_DOMAIN;
const audience = process.env.CF_ACCESS_AUD;
if (issuer !== 'https://utoa.cloudflareaccess.com' || !audience) throw Error('請先配置本機 CF_ACCESS_TEAM_DOMAIN 與 CF_ACCESS_AUD');
console.log('請在 Cloudflare 瀏覽器頁面完成管理員登入。');
execFileSync('cloudflared', ['access', 'login', '--quiet', 'https://utoa.studio/admin'], { stdio: 'inherit' });
const token = execFileSync('cloudflared', ['access', 'token', '--app=https://utoa.studio/admin'], { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim();
const { payload } = await jwtVerify(token, createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)), { issuer, audience, algorithms: ['RS256'], requiredClaims: ['email','exp','iat','sub'] });
const admins = (process.env.ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase());
if (typeof payload.email !== 'string' || !admins.includes(payload.email.toLowerCase())) throw Error('此帳號不在管理員名單內');
const reservation = net.createServer();
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const upstreamPort = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const port = Number(process.env.UTOA_LOCAL_ADMIN_PORT || 3020);
const gateway = createAdminProxy({ port, upstreamPort, token, expiresAt: payload.exp * 1000 });
await new Promise((resolve,reject) => { gateway.server.once('error',reject); gateway.server.listen(port, '127.0.0.1',resolve); });
const child = spawn(process.execPath, [fileURLToPath(new URL('../../node_modules/next/dist/bin/next', import.meta.url)), 'dev','--hostname','127.0.0.1','--port',String(upstreamPort)], { cwd: root, stdio: 'inherit', env: { ...process.env, NODE_ENV:'development' } });
let closing = false;
function close() { if (closing) return; closing = true; gateway.server.closeAllConnections(); gateway.server.close(); child.kill('SIGTERM'); }
process.on('SIGINT',close); process.on('SIGTERM',close); child.on('exit',close);
const expiry = setTimeout(close, Math.max(1,payload.exp*1000-Date.now())); expiry.unref();
let ready = false;
for (let i=0;i<120;i++) {
  if (closing) break;
  try { const r=await fetch(`http://127.0.0.1:${upstreamPort}/admin`,{signal:AbortSignal.timeout(1500)}); if(r.status===401) { ready = true; break; } } catch {}
  await new Promise(resolve=>setTimeout(resolve,500));
}
if (!ready && !closing) { close(); process.exitCode = 1; console.error('本機 Next.js 啟動逾時，已停止登入代理。'); }
if (ready && !closing) {
  console.log(`本機後台：${gateway.origin}/admin（已自動開啟登入頁）；結束請按 Ctrl+C。`);
  // The one-use bootstrap is in a URL fragment, never an HTTP request or terminal log.
  const opener=spawn(process.platform==='darwin'?'open':'xdg-open',[gateway.loginUrl],{stdio:'ignore'});
  opener.on('error',()=>console.error('無法自動開啟瀏覽器，請確認系統預設瀏覽器。'));
}
