/* Quick probe script to reproduce API/page responses */
async function main() {
  const base = 'http://localhost:3000';
  const post = (u, d) => fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(d) });

  const yRes = await post(`${base}/api/years`, { label: 'Test Year 2024', status: 'published' });
  console.log('POST /api/years status:', yRes.status);

  const ys = await (await fetch(`${base}/api/years`)).json();
  const y = Array.isArray(ys) ? ys.find(x => x.label === 'Test Year 2024') : null;
  console.log('year id:', y && y.id);
  if (!y) return;

  const c1Res = await post(`${base}/api/years/${y.id}/collections`, { slug: 'probe-collection', title: 'Probe Collection', status: 'published' });
  console.log('POST /api/years/{id}/collections status:', c1Res.status);
  const c1 = await c1Res.json().catch(() => ({}));
  console.log('collection id:', c1 && c1.id);
  if (!c1 || !c1.id) return;

  const colApi = await fetch(`${base}/api/collections/${c1.id}?include_assets=true`);
  const colApiCt = colApi.headers.get('content-type');
  const colApiText = await colApi.text();
  console.log('GET /api/collections/{id}?include_assets status:', colApi.status, 'ct:', colApiCt, 'body head:', colApiText.slice(0, 160));

  const pageRes = await fetch(`${base}/admin/collections/${c1.id}`, { headers: { 'Cf-Access-Jwt-Assertion': 'test' } });
  const pageCt = pageRes.headers.get('content-type');
  const pageText = await pageRes.text();
  console.log('GET /admin/collections/{id} status:', pageRes.status, 'ct:', pageCt, 'body head:', pageText.slice(0, 200));
}

main().catch(err => { console.error('probe error:', err); process.exit(1); });
