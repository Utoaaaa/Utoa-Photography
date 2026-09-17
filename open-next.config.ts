import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Preserve the existing no-persistent-cache setup; no new remote bindings required.
export default defineCloudflareConfig({
  incrementalCache: 'dummy',
  tagCache: 'dummy',
  queue: 'dummy',
});
