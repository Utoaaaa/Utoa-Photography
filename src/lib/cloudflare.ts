/**
 * Helper to safely get Cloudflare context in both dev and production environments
 */

export interface CloudflareEnv {
  DB?: any;
  UPLOADS?: any;
  ASSETS?: any;
  [key: string]: any;
}

export function getCloudflareEnv(): CloudflareEnv {
  const isDev = process.env.NODE_ENV !== 'production';
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const { env } = getCloudflareContext();
    return env as CloudflareEnv;
  } catch (e) {
    if (isDev) {
      console.warn('[cloudflare] Context not available in dev mode. Use "npm run dev:worker" for full Cloudflare bindings.');
      // Return empty object in dev mode
      return {};
    }
    // Re-throw in production
    throw new Error('Failed to get Cloudflare context in production environment');
  }
}

export function getD1Database(): any {
  const env = getCloudflareEnv();
  return env.DB;
}

export function getR2Bucket(): any {
  const env = getCloudflareEnv();
  return env.UPLOADS;
}
