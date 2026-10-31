type PrismaClient = import('@prisma/client').PrismaClient;

/** A collection or location that shows the asset as its cover (cover_asset_id has no FK). */
export type AssetCoverReference = { kind: 'collection' | 'location'; id: string };

export async function findAssetCoversD1(
  db: Pick<D1Database, 'prepare'>,
  assetId: string,
): Promise<AssetCoverReference[]> {
  const result = await db
    .prepare(
      `SELECT 'collection' AS kind, id FROM collections WHERE cover_asset_id = ?1
       UNION ALL
       SELECT 'location' AS kind, id FROM locations WHERE cover_asset_id = ?1`,
    )
    .bind(assetId)
    .all<{ kind: AssetCoverReference['kind']; id: string }>();
  return (result.results ?? []).map((row) => ({ kind: row.kind, id: String(row.id) }));
}

export async function findAssetCoversPrisma(prisma: PrismaClient, assetId: string): Promise<AssetCoverReference[]> {
  const [collections, locations] = await Promise.all([
    prisma.collection.findMany({ where: { cover_asset_id: assetId }, select: { id: true } }),
    prisma.location.findMany({ where: { cover_asset_id: assetId }, select: { id: true } }),
  ]);
  return [
    ...collections.map(({ id }) => ({ kind: 'collection' as const, id })),
    ...locations.map(({ id }) => ({ kind: 'location' as const, id })),
  ];
}
