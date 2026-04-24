import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

export async function listImageFiles(rootDir: string): Promise<string[]> {
  const resolved = path.resolve(rootDir);
  const results: string[] = [];

  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    const sortedEntries = entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of sortedEntries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTENSIONS.has(extension)) {
        results.push(absolutePath);
      }
    }
  }

  await walk(resolved);
  return results;
}

export async function ensureFileExists(filePath: string): Promise<void> {
  const stats = await fs.stat(filePath).catch(() => null);
  if (!stats || !stats.isFile()) {
    throw new Error(`File not found: ${filePath}`);
  }
}

export async function getImageSize(filePath: string): Promise<{ width: number; height: number }> {
  const metadata = await sharp(filePath).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Unable to read image dimensions: ${filePath}`);
  }
  return { width: metadata.width, height: metadata.height };
}

export function detectMimeType(filePath: string): string {
  return MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

export async function computeStableAssetId(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const digest = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 16);
  return `r2-cli-${digest}`;
}
