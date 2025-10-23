/// <reference types="@cloudflare/workers-types" />

// Augment the OpenNext Cloudflare env with our bindings
declare module '@opennextjs/cloudflare' {
  interface CloudflareEnv {
    DB: D1Database;
    UPLOADS: R2Bucket;
  }
}

