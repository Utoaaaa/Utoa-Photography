#!/usr/bin/env node
"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const METADATA_PATH = path.join(__dirname, "..", "..", "tests", "fixtures", "images", "metadata.json");
const TEST_ASSET_NAMESPACE = "fixture-test-image";

function toAssetId(filename) {
  const basename = filename.replace(/\.[^.]+$/, "");
  return `${TEST_ASSET_NAMESPACE}-${basename}`;
}

function buildMetadataPayload(entry) {
  return {
    filename: entry.filename,
    title: entry.title,
    subtitle: entry.subtitle,
    dimensions: {
      width: entry.width,
      height: entry.height,
    },
    gradient: entry.gradient,
    accent: entry.accent,
    source: "generate-test-images",
    generatedAt: new Date().toISOString(),
  };
}

async function readMetadata() {
  try {
    const raw = await fs.readFile(METADATA_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.images)) {
      throw new Error("metadata.json is missing the `images` array.");
    }
    return parsed.images;
  } catch (error) {
    throw new Error(`Unable to read metadata at ${METADATA_PATH}: ${error.message}`);
  }
}

async function upsertAsset(entry) {
  const id = toAssetId(entry.filename);
  const alt = entry.title;
  const caption = entry.subtitle;
  const width = Number.parseInt(entry.width, 10);
  const height = Number.parseInt(entry.height, 10);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error(`Invalid dimensions for ${entry.filename}`);
  }

  const metadataPayload = buildMetadataPayload(entry);

  const result = await prisma.asset.upsert({
    where: { id },
    update: {
      alt,
      caption,
      width,
      height,
      metadata_json: JSON.stringify(metadataPayload),
    },
    create: {
      id,
      alt,
      caption,
      width,
      height,
      metadata_json: JSON.stringify(metadataPayload),
    },
  });

  return result;
}

async function main() {
  console.log("Importing generated test images into the database…");
  const entries = await readMetadata();
  const results = [];

  for (const entry of entries) {
    const record = await upsertAsset(entry);
    results.push(record);
    console.log(`• ${record.id} (${record.width}×${record.height})`);
  }

  console.log(`\nCompleted. ${results.length} test assets are now available.`);
}

main()
  .catch((error) => {
    console.error("Failed to import test images:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
