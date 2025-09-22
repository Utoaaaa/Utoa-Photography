const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Ensure MOCK year exists for contract PUT test
  await prisma.year.upsert({
    where: { id: '550e8400-e29b-41d4-a716-446655440000' },
    update: {},
    create: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      label: 'MOCK',
      order_index: '2000.0',
      status: 'draft',
    },
  });

  // Create sample years
  const year2024 = await prisma.year.upsert({
    where: { id: '550e8400-e29b-41d4-a716-446655440001' },
    update: {},
    create: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      label: '2024',
      order_index: '2024.0',
      status: 'published',
    },
  });

  const year2023 = await prisma.year.upsert({
    where: { id: '550e8400-e29b-41d4-a716-446655440002' },
    update: {},
    create: {
      id: '550e8400-e29b-41d4-a716-446655440002',
      label: '2023',
      order_index: '2023.0',
      status: 'published',
    },
  });

  const year2022 = await prisma.year.upsert({
    where: { id: '550e8400-e29b-41d4-a716-446655440003' },
    update: {},
    create: {
      id: '550e8400-e29b-41d4-a716-446655440003',
      label: '2022',
      order_index: '2022.0',
      status: 'draft',
    },
  });

  console.log('✅ Created years:', { year2024, year2023, year2022 });

  // Create sample assets
  const asset1 = await prisma.asset.upsert({
    where: { id: 'cloudflare-image-id-1' },
    update: {},
    create: {
      id: 'cloudflare-image-id-1',
      alt: 'Beautiful landscape photo',
      caption: 'A stunning sunset over the mountains',
      width: 1920,
      height: 1080,
      metadata_json: JSON.stringify({
        camera: 'Canon EOS R5',
        lens: '24-70mm f/2.8',
        iso: 100,
        aperture: 'f/8',
        shutter: '1/250s',
      }),
    },
  });

  const asset2 = await prisma.asset.upsert({
    where: { id: 'cloudflare-image-id-2' },
    update: {},
    create: {
      id: 'cloudflare-image-id-2',
      alt: 'Street photography scene',
      caption: 'City life in black and white',
      width: 1600,
      height: 2400,
    },
  });

  const asset3 = await prisma.asset.upsert({
    where: { id: 'cloudflare-image-id-3' },
    update: {},
    create: {
      id: 'cloudflare-image-id-3',
      alt: 'Portrait photography',
      caption: 'Natural light portrait',
      width: 2000,
      height: 3000,
    },
  });

  console.log('✅ Created assets:', { asset1, asset2, asset3 });

  // Create sample collections
  const collection1 = await prisma.collection.upsert({
    where: { year_id_slug: { year_id: year2024.id, slug: 'spring-vibes' } },
    update: {},
    create: {
      year_id: year2024.id,
      slug: 'spring-vibes',
      title: 'Spring Vibes',
      summary: 'Capturing the beauty of spring season',
      cover_asset_id: asset1.id,
      status: 'published',
      order_index: '1.0',
      published_at: new Date('2024-03-15'),
    },
  });

  const collection2 = await prisma.collection.upsert({
    where: { year_id_slug: { year_id: year2024.id, slug: 'urban-stories' } },
    update: {},
    create: {
      year_id: year2024.id,
      slug: 'urban-stories',
      title: 'Urban Stories',
      summary: 'Stories from the city streets',
      cover_asset_id: asset2.id,
      status: 'published',
      order_index: '2.0',
      published_at: new Date('2024-06-01'),
    },
  });

  const collection3 = await prisma.collection.upsert({
    where: { year_id_slug: { year_id: year2023.id, slug: 'portraits' } },
    update: {},
    create: {
      year_id: year2023.id,
      slug: 'portraits',
      title: 'Portraits',
      summary: 'Character studies and portraits',
      cover_asset_id: asset3.id,
      status: 'published',
      order_index: '1.0',
      published_at: new Date('2023-08-20'),
    },
  });

  console.log('✅ Created collections:', { collection1, collection2, collection3 });

  // Create collection-asset associations (idempotent via upsert for SQLite)
  const collectionAssets = [
    { collection_id: collection1.id, asset_id: asset1.id, order_index: '1.0' },
    { collection_id: collection1.id, asset_id: asset2.id, order_index: '2.0' },
    { collection_id: collection2.id, asset_id: asset2.id, order_index: '1.0' },
    { collection_id: collection3.id, asset_id: asset3.id, order_index: '1.0' },
  ];

  for (const ca of collectionAssets) {
    await prisma.collectionAsset.upsert({
      where: {
        collection_id_asset_id: {
          collection_id: ca.collection_id,
          asset_id: ca.asset_id,
        },
      },
      update: { order_index: ca.order_index },
      create: ca,
    });
  }

  console.log('✅ Created collection-asset associations');

  // Create sample SEO metadata (idempotent via upsert for SQLite)
  const seoItems = [
    {
      entity_type: 'homepage',
      entity_id: 'homepage',
      title: 'Utoa Photography - 攝影作品展示',
      description: '個人攝影作品集，以極簡風格展示多年創作成果',
      og_asset_id: asset1.id,
    },
    {
      entity_type: 'year',
      entity_id: year2024.id,
      title: '2024 攝影作品 - Utoa Photography',
      description: '2024年度攝影作品集合',
    },
    {
      entity_type: 'collection',
      entity_id: collection1.id,
      title: 'Spring Vibes - 2024 攝影作品',
      description: 'Capturing the beauty of spring season',
      og_asset_id: asset1.id,
    },
  ];

  for (const s of seoItems) {
    await prisma.sEOMetadata.upsert({
      where: {
        entity_type_entity_id: {
          entity_type: s.entity_type,
          entity_id: s.entity_id,
        },
      },
      update: {
        title: s.title ?? null,
        description: s.description ?? null,
        og_asset_id: s.og_asset_id ?? null,
      },
      create: s,
    });
  }

  console.log('✅ Created SEO metadata');
  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });