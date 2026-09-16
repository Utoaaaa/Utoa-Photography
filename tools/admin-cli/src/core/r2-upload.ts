import { createReadStream } from 'node:fs';
import path from 'node:path';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { detectMimeType } from './files';

const DEFAULT_BUCKET = 'utoa-photography-assets';
const DEFAULT_PUBLIC_BASE_ORIGIN = 'https://images.utoa.studio';
const DEFAULT_OBJECT_PREFIX = 'images';
const DEFAULT_VARIANT_EXT = 'webp';
const IMAGE_VARIANT_CACHE_CONTROL = 'public, max-age=31536000, immutable';

type VariantName = 'thumb' | 'small' | 'medium' | 'desktop' | 'large';

const VARIANT_CONFIG: Record<VariantName, string> = {
  thumb: 'w=300,q=85,fit=cover',
  small: 'w=960,h=960,q=85,fit=scale-down',
  desktop: 'w=1920,h=1920,q=85,fit=scale-down',
  medium: 'w=1200,q=85,fit=contain',
  large: 'w=3840,q=85,fit=contain',
};

export type DirectR2UploadConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseOrigin: string;
  objectPrefix: string;
  variantExt: string;
  generateVariants: boolean;
};

export type DirectR2UploadConfigResult =
  | { ok: true; config: DirectR2UploadConfig }
  | { ok: false; missing: string[] };

function optionalEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function envFlagDisabled(name: string): boolean {
  const value = process.env[name];
  if (!value) return false;
  return ['0', 'false', 'no', 'off'].includes(value.trim().toLowerCase());
}

function envFlagEnabled(name: string): boolean {
  const value = process.env[name];
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function normalizeBaseOrigin(value: string): string {
  return value.replace(/\/+$/, '');
}

function getOriginalExt(filePath: string): string {
  const ext = path.extname(filePath).replace(/^\./, '').toLowerCase();
  return ext === 'jpeg' ? 'jpg' : ext || 'jpg';
}

function getResizeFormat(ext: string): string {
  if (ext === 'jpg') return 'jpeg';
  return ext;
}

function getVariantContentType(ext: string): string {
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'avif') return 'image/avif';
  return 'image/webp';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getDirectR2UploadConfig(): DirectR2UploadConfigResult {
  const accountId = optionalEnv('CF_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID');
  const accessKeyId = optionalEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = optionalEnv('R2_SECRET_ACCESS_KEY');
  const missing: string[] = [];

  if (!accountId) missing.push('CF_ACCOUNT_ID or CLOUDFLARE_ACCOUNT_ID');
  if (!accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');

  if (missing.length > 0) {
    return { ok: false, missing };
  }
  if (!accountId || !accessKeyId || !secretAccessKey) {
    return { ok: false, missing };
  }

  const generateVariants =
    !envFlagEnabled('UTOA_ADMIN_CLI_SKIP_VARIANTS') &&
    !envFlagDisabled('UTOA_ADMIN_CLI_GENERATE_VARIANTS');

  return {
    ok: true,
    config: {
      accountId,
      accessKeyId,
      secretAccessKey,
      bucket: optionalEnv('UTOA_R2_BUCKET', 'R2_BUCKET') ?? DEFAULT_BUCKET,
      publicBaseOrigin: normalizeBaseOrigin(
        optionalEnv('UTOA_R2_PUBLIC_BASE_ORIGIN', 'NEXT_PUBLIC_R2_PUBLIC_BASE_ORIGIN') ??
          DEFAULT_PUBLIC_BASE_ORIGIN
      ),
      objectPrefix:
        optionalEnv('UTOA_R2_OBJECT_PREFIX', 'NEXT_PUBLIC_R2_OBJECT_PREFIX') ??
        DEFAULT_OBJECT_PREFIX,
      variantExt:
        (optionalEnv('UTOA_R2_VARIANT_EXT', 'NEXT_PUBLIC_R2_VARIANT_EXT') ??
          DEFAULT_VARIANT_EXT).replace(/^\./, ''),
      generateVariants,
    },
  };
}

export class DirectR2Uploader {
  private readonly s3: S3Client;

  constructor(private readonly config: DirectR2UploadConfig) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  describe(): string {
    const variantNote = this.config.generateVariants ? 'with variants' : 'without variants';
    return `direct R2 bucket ${this.config.bucket} ${variantNote}`;
  }

  generatesVariants(): boolean {
    return this.config.generateVariants;
  }

  async uploadOriginalWithVariants(filePath: string, imageId: string): Promise<void> {
    const originalExt = getOriginalExt(filePath);
    const originalKey = `${this.config.objectPrefix}/${imageId}/original.${originalExt}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: originalKey,
        Body: createReadStream(filePath),
        ContentType: detectMimeType(filePath),
      })
    );

    if (this.config.generateVariants) {
      await this.generateVariants(imageId, originalExt);
    }
  }

  private async generateVariants(imageId: string, originalExt: string): Promise<void> {
    const variantNames = Object.keys(VARIANT_CONFIG) as VariantName[];
    const results = await Promise.allSettled(
      variantNames.map((variant) => this.generateVariant(imageId, originalExt, variant))
    );
    const errors = results
      .map((result, index) => ({ result, variant: variantNames[index] }))
      .filter(
        (entry): entry is { result: PromiseRejectedResult; variant: VariantName } =>
          entry.result.status === 'rejected'
      )
      .map((entry) => `${entry.variant}:${entry.result.reason instanceof Error ? entry.result.reason.message : String(entry.result.reason)}`);

    if (errors.length > 0) {
      throw new Error(`R2 variant generation failed: ${errors.join(', ')}`);
    }
  }

  private async generateVariant(
    imageId: string,
    originalExt: string,
    variant: VariantName
  ): Promise<void> {
    const encodedId = encodeURIComponent(imageId);
    const sourcePath = `${this.config.objectPrefix}/${encodedId}/original.${originalExt}`;
    const outputFormat = getResizeFormat(this.config.variantExt);
    const resizeParams = `${VARIANT_CONFIG[variant]},f=${outputFormat}`;
    const resizeUrl = `${this.config.publicBaseOrigin}/cdn-cgi/image/${resizeParams}/${sourcePath}`;
    const response = await this.fetchWithRetry(resizeUrl);
    const body = new Uint8Array(await response.arrayBuffer());
    const key = `${this.config.objectPrefix}/${imageId}/${variant}.${this.config.variantExt}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: response.headers.get('content-type') ?? getVariantContentType(this.config.variantExt),
        CacheControl: IMAGE_VARIANT_CACHE_CONTROL,
      })
    );
  }

  private async fetchWithRetry(url: string): Promise<Response> {
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: {
            accept: 'image/webp',
            'cache-control': 'no-cache',
          },
        });
        if (response.ok) {
          return response;
        }
        lastError = new Error(`resize fetch ${response.status}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      if (attempt < 3) {
        await sleep(500 * attempt);
      }
    }

    throw lastError ?? new Error('resize fetch failed');
  }
}
