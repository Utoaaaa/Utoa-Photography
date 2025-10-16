#!/usr/bin/env node
/*
 * Upload .next/static/* to Cloudflare R2 with correct Content-Type
 * Env required:
 *   CF_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');

const BUCKET = process.env.R2_BUCKET || 'utoa-photography-assets';
const ROOT = path.resolve(process.cwd(), '.next', 'static');

async function* walk(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (e.isFile()) {
      yield full;
    }
  }
}

function ensureEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function main() {
  if (!fs.existsSync(ROOT)) {
    console.error('No .next/static found. Run build first.');
    process.exit(1);
  }

  const accountId = ensureEnv('CF_ACCOUNT_ID');
  const accessKeyId = ensureEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = ensureEnv('R2_SECRET_ACCESS_KEY');

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });

  // collect file list
  const files = [];
  for await (const file of walk(ROOT)) files.push(file);

  // process in chunks for controlled concurrency
  const chunkSize = 12;
  let uploaded = 0;

  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (file) => {
        const rel = path.relative(ROOT, file).replace(/\\/g, '/');
        const key1 = `_next/static/${rel}`;
        const key2 = `_assets/_next/static/${rel}`; // for adapters expecting originPath "_assets"
        const contentType = mime.lookup(file) || 'application/octet-stream';
        const cacheControl = 'public, max-age=31536000, immutable';
        try {
          // upload to both prefixes for compatibility
          await s3.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: key1,
            Body: fs.createReadStream(file),
            ContentType: contentType,
            CacheControl: cacheControl,
          }));
          await s3.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: key2,
            Body: fs.createReadStream(file),
            ContentType: contentType,
            CacheControl: cacheControl,
          }));
          uploaded++;
        } catch (e) {
          console.error(`Upload failed for ${rel}:`, e?.message || e);
          throw e;
        }
      })
    );
    console.log(`Uploaded ${Math.min(i + chunk.length, files.length)} / ${files.length} objects...`);
  }

  console.log(`✅ Done. Uploaded ${uploaded} objects to R2 bucket ${BUCKET}.`);
}

main().catch((err) => {
  console.error('❌ Upload failed:', err?.message || err);
  process.exit(1);
});
