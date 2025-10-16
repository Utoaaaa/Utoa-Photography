#!/usr/bin/env node

const { writeFile, mkdir } = require('node:fs/promises');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

// Load environment variables from .env/.env.local for build-time script
try {
  const fs = require('node:fs');
  const root = process.cwd();
  const envFiles = ['.env.local', '.env'];
  for (const f of envFiles) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const idx = t.indexOf('=');
      if (idx === -1) continue;
      const key = t.slice(0, idx).trim();
      let val = t.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  }
} catch (_) {}

const prisma = new PrismaClient();

function mapCollection(collection) {
  return {
    id: collection.id,
    slug: collection.slug,
    title: collection.title,
    summary: collection.summary ?? null,
    coverAssetId: collection.cover_asset_id ?? null,
    orderIndex: collection.order_index,
    publishedAt: collection.published_at ? collection.published_at.toISOString() : null,
    updatedAt: collection.updated_at.toISOString(),
  };
}

function mapLocation(location) {
  const collections = (location.collections ?? []).map(mapCollection);
  return {
    id: location.id,
    yearId: location.year_id,
    slug: location.slug,
    name: location.name,
    summary: location.summary ?? null,
    coverAssetId: location.cover_asset_id ?? null,
    orderIndex: location.order_index,
    collectionCount: collections.length,
    collections,
  };
}

function mapYear(year) {
  const locations = (year.locations ?? []).map(mapLocation);
  return {
    id: year.id,
    label: year.label,
    orderIndex: year.order_index,
    status: year.status,
    locations,
  };
}

async function fetchYearLocationData() {
  const years = await prisma.year.findMany({
    where: { status: 'published' },
    orderBy: { order_index: 'asc' },
    include: {
      locations: {
        orderBy: { order_index: 'asc' },
        include: {
          collections: {
            where: { status: 'published' },
            orderBy: { order_index: 'asc' },
            select: {
              id: true,
              slug: true,
              title: true,
              summary: true,
              cover_asset_id: true,
              order_index: true,
              published_at: true,
              updated_at: true,
            },
          },
        },
      },
    },
  });

  return years.map(mapYear);
}

async function writeOutputFile(data) {
  const outputDir = path.resolve(process.cwd(), 'public', 'data');
  const outputPath = path.join(outputDir, 'year-location.json');

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        years: data,
      },
      null,
      2,
    ),
  );

  return outputPath;
}

async function main() {
  try {
    // If DATABASE_URL is not provided (eg. CI preview), fall back to empty payload
    if (!process.env.DATABASE_URL) {
      console.warn('[generate-year-location] DATABASE_URL not set; writing empty payload for CI');
      const outputPath = await writeOutputFile([]);
      console.log(`✅ year-location.json (empty) generated at ${outputPath}`);
      return;
    }

    const data = await fetchYearLocationData();
    const outputPath = await writeOutputFile(data);
    console.log(`✅ year-location.json generated at ${outputPath}`);
  } catch (error) {
    console.error('⚠️ Failed to generate year-location data; writing empty payload instead. Error:', error);
    try {
      const outputPath = await writeOutputFile([]);
      console.log(`✅ year-location.json (empty) generated at ${outputPath}`);
    } catch (err2) {
      console.error('❌ Fallback write failed:', err2);
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
