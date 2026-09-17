import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createAdminProxy } from '../../tools/security/local-admin-proxy.mjs';

test('local gateway requires one-use session, rejects cross-site/host spoofing, expires and revokes', async t => {
  let seen;
  const upstream = http.createServer((req,res)=>{seen=req.headers;res.end('ok');});
  await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
  const reservation=http.createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
  const gateway=createAdminProxy({port,upstreamPort:upstream.address().port,token:'verified-test-token',expiresAt:Date.now()+60000});
  await new Promise(r=>gateway.server.listen(port,'127.0.0.1',r));
  t.after(()=>{gateway.server.closeAllConnections();gateway.server.close();upstream.closeAllConnections();upstream.close();});
  const request=(path,options)=>fetch(gateway.origin+path,options);
  assert.equal((await request('/admin')).status,401);
  assert.equal(await new Promise((resolve,reject)=>{const r=http.get(gateway.origin+'/admin',{headers:{host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});r.on('error',reject);}),403);
  assert.equal((await request('/admin',{headers:{origin:'https://evil.example'}})).status,403);
  assert.equal((await request('/admin',{headers:{'sec-fetch-site':'cross-site'}})).status,403);
  const login=await request('/__local/login');assert.equal(login.status,200);assert.ok(!((await login.text()).includes('verified-test-token')));
  const options={method:'POST',headers:{origin:gateway.origin},body:new URL(gateway.loginUrl).hash.slice(1)};
  assert.equal((await request('/__local/session',{...options,body:'bad'})).status,403);
  const session=await request('/__local/session',options);assert.equal(session.status,204);
  const raw=session.headers.get('set-cookie');assert.match(raw,/HttpOnly/);assert.match(raw,/SameSite=Strict/);const cookie=raw.split(';')[0];
  assert.equal((await request('/__local/session',options)).status,403);
  assert.equal((await request('/api/admin/years',{method:'POST',headers:{cookie,origin:gateway.origin,authorization:'Bearer malicious','cf-access-jwt-assertion':'malicious','x-forwarded-host':'evil'},body:'{}'})).status,200);
  assert.equal(seen['cf-access-jwt-assertion'],'verified-test-token');assert.equal(seen.authorization,undefined);assert.equal(seen['x-forwarded-host'],undefined);assert.equal(seen.origin,`http://127.0.0.1:${upstream.address().port}`);assert.ok(!seen.cookie.includes('utoa_local'));
  assert.equal((await request('/__local/logout',{method:'POST',headers:{cookie,origin:gateway.origin}})).status,204);
  assert.equal((await request('/admin',{headers:{cookie}})).status,401);
});

test('expired credential cannot create a local session', async t=>{
  const reservation=http.createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
  const g=createAdminProxy({port,upstreamPort:3000,token:'expired',expiresAt:Date.now()-1});await new Promise(r=>g.server.listen(port,'127.0.0.1',r));t.after(()=>{g.server.closeAllConnections();g.server.close();});
  assert.equal((await fetch(g.origin+'/__local/session',{method:'POST',headers:{origin:g.origin},body:new URL(g.loginUrl).hash.slice(1)})).status,403);
});
