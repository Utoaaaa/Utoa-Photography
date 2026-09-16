import config from '../../next.config';

it('allows image routes to set no-store on fallback and error responses', async () => {
  if (!config.headers) throw new Error('Expected site headers configuration');
  const rules = await config.headers();
  const imageRule = rules.find(rule => rule.source === '/images/:path*');
  expect(imageRule?.headers.some(header => header.key.toLowerCase() === 'cache-control' && header.value.includes('immutable'))).not.toBe(true);
});
