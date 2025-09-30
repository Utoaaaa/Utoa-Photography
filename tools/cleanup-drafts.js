#!/usr/bin/env node
/*
  Cleanup drafts: delete draft Years and draft Collections and their dependents.
  Steps:
    1) Report counts for draft Year / Collection as preview
    2) Delete SEO metadata tied to these entities
    3) Delete draft Collections (PublishHistory/CollectionAssets cascade via model relations deleteMany)
    4) Delete draft Years (Collections removed via onDelete: Cascade)
*/

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [draftYears, draftCollections] = await Promise.all([
    prisma.year.count({ where: { status: 'draft' } }),
    prisma.collection.count({ where: { status: 'draft' } }),
  ]);

  console.log(`Draft preview -> years: ${draftYears}, collections: ${draftCollections}`);

  // Delete SEO metadata referencing those draft entities
  const draftYearIds = (await prisma.year.findMany({ where: { status: 'draft' }, select: { id: true } })).map(y => y.id);
  const draftCollectionIds = (await prisma.collection.findMany({ where: { status: 'draft' }, select: { id: true } })).map(c => c.id);

  await prisma.sEOMetadata.deleteMany({
    where: {
      OR: [
        { entity_type: 'year', entity_id: { in: draftYearIds } },
        { entity_type: 'collection', entity_id: { in: draftCollectionIds } },
      ],
    },
  });

  // Delete draft collections -> related publishHistory / collectionAssets are removed by explicit deleteMany below
  await prisma.publishHistory.deleteMany({ where: { collection_id: { in: draftCollectionIds } } });
  await prisma.collectionAsset.deleteMany({ where: { collection_id: { in: draftCollectionIds } } });
  await prisma.collection.deleteMany({ where: { id: { in: draftCollectionIds } } });

  // Delete draft years (with onDelete: Cascade for collections)
  await prisma.year.deleteMany({ where: { id: { in: draftYearIds } } });

  const [afterYears, afterCollections] = await Promise.all([
    prisma.year.count({ where: { status: 'draft' } }),
    prisma.collection.count({ where: { status: 'draft' } }),
  ]);
  console.log(`After cleanup -> years: ${afterYears}, collections: ${afterCollections}`);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
