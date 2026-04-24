import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function resolveAccessToken(
  baseUrl: string,
  explicitToken?: string
): Promise<{ token: string; source: string }> {
  if (explicitToken && explicitToken.trim()) {
    return { token: explicitToken.trim(), source: 'option' };
  }

  const envToken = process.env.CF_ACCESS_TOKEN || process.env.UTOA_CF_ACCESS_TOKEN;
  if (envToken && envToken.trim()) {
    return { token: envToken.trim(), source: 'env' };
  }

  const { stdout } = await execFileAsync('cloudflared', ['access', 'token', `-app=${baseUrl}`]);
  const token = stdout.trim();
  if (!token) {
    throw new Error('Unable to resolve Cloudflare Access token');
  }
  return { token, source: 'cloudflared' };
}
