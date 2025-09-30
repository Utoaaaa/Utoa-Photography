#!/usr/bin/env node
/*
  Keep the oldest Year(s) (by created_at asc, then order_index asc) and delete others.
  - Deletes related Collections, CollectionAssets, PublishHistory, and SEOMetadata (year/collection only).
  - Optionally prunes orphan Assets not referenced by any CollectionAsset nor seo_metadata.og_asset_id.

  Usage:
    node tools/cleanup-keep-oldest.js [--dry-run] [--prune-orphan-assets] [--keep N]
*/

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseFlags() {
  const argv = process.argv.slice(2);
  const result = {
    dryRun: argv.includes('--dry-run'),
    pruneOrphans: argv.includes('--prune-orphan-assets'),
    keep: 1,
  };

  // support --keep=2 or --keep 2
  const keepEq = argv.find((a) => a.startsWith('--keep='));
  if (keepEq) {
    const v = parseInt(keepEq.split('=')[1], 10);
    if (!Number.isNaN(v) && v > 0) result.keep = v;
  } else {
    const idx = argv.indexOf('--keep');
    if (idx !== -1 && idx + 1 < argv.length) {
      const v = parseInt(argv[idx + 1], 10);
      if (!Number.isNaN(v) && v > 0) result.keep = v;
    }
  }
  return result;
}

async function main() {
  const { dryRun, pruneOrphans, keep } = parseFlags();

  // 1) Oldest Year(s) to keep
  const oldestList = await prisma.year.findMany({
    orderBy: [
      { created_at: 'asc' },
      { order_index: 'asc' },
    ],
    take: keep,
    select: { id: true, label: true, created_at: true },
  });

  if (!oldestList || oldestList.length === 0) {
    console.log('No Year found. Nothing to do.');
    return;
  }

  const keepIds = oldestList.map((y) => y.id);
  console.log(`Keeping ${keepIds.length} oldest year(s):`);
  oldestList.forEach((y, i) => {
    console.log(`  [${i + 1}] ${y.label} (id=${y.id}) created_at=${new Date(y.created_at).toISOString()}`);
  });

  // 2) Other years to delete
  const otherYears = await prisma.year.findMany({
    where: { id: { notIn: keepIds } },
    select: { id: true, label: true },
  });

  if (otherYears.length === 0) {
    console.log('Only the kept Year(s) exist. Nothing to delete.');
    return;
  }

  console.log(`Years to delete (${otherYears.length}): ${otherYears.map(y => y.label).join(', ')}`);

  // 3) Collections under those years
  const collections = await prisma.collection.findMany({
    where: { year_id: { in: otherYears.map(y => y.id) } },
    select: { id: true, slug: true },
  });
  console.log(`Collections to delete: ${collections.length}`);

  // 4) Preview dependent counts
  const [collectionAssetsCount, publishHistoryCount, seoMetaCount] = await Promise.all([
    prisma.collectionAsset.count({ where: { collection_id: { in: collections.map(c => c.id) } } }),
    prisma.publishHistory.count({ where: { collection_id: { in: collections.map(c => c.id) } } }),
    prisma.sEOMetadata.count({ where: { OR: [
      { entity_type: 'year', entity_id: { in: otherYears.map(y => y.id) } },
      { entity_type: 'collection', entity_id: { in: collections.map(c => c.id) } },
      // homepage kept
    ] } }),
  ]);

  console.log(`Dependent counts -> collection_assets: ${collectionAssetsCount}, publish_history: ${publishHistoryCount}, seo_metadata: ${seoMetaCount}`);

  if (dryRun) {
    console.log('[DRY RUN] No changes will be applied.');
    await prisma.$disconnect();
    return;
  }

  // 5) Delete dependents then parents
  await prisma.publishHistory.deleteMany({ where: { collection_id: { in: collections.map(c => c.id) } } });
  await prisma.collectionAsset.deleteMany({ where: { collection_id: { in: collections.map(c => c.id) } } });
  await prisma.sEOMetadata.deleteMany({ where: { OR: [
    { entity_type: 'year', entity_id: { in: otherYears.map(y => y.id) } },
    { entity_type: 'collection', entity_id: { in: collections.map(c => c.id) } },
  ] } });
  await prisma.collection.deleteMany({ where: { id: { in: collections.map(c => c.id) } } });
  await prisma.year.deleteMany({ where: { id: { in: otherYears.map(y => y.id) } } });

  console.log('Deleted all non-oldest years and related records.');

  if (pruneOrphans) {
    const orphanAssets = await prisma.$queryRaw`
      SELECT a.id FROM assets a
      LEFT JOIN collection_assets ca ON ca.asset_id = a.id
      LEFT JOIN seo_metadata sm ON sm.og_asset_id = a.id
      WHERE ca.asset_id IS NULL AND sm.og_asset_id IS NULL
    `;
    if (Array.isArray(orphanAssets) && orphanAssets.length > 0) {
      const ids = orphanAssets.map(r => r.id);
      console.log(`Pruning orphan assets: ${ids.length}`);
      await prisma.asset.deleteMany({ where: { id: { in: ids } } });
    } else {
      console.log('No orphan assets to prune.');
    }
  }

  await prisma.$disconnect();
  console.log('Cleanup completed.');
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
