import path from 'node:path';

import type {
  AdminCliPlan,
  AssetPlan,
  CollectionRecord,
  LocationRecord,
  RunState,
  YearRecord,
} from '../types';
import { filenameToLabel, nowIso } from '../utils';
import { resolveAccessToken } from './auth';
import { AdminApiClient } from './api';
import { computeStableAssetId, ensureFileExists, getImageSize } from './files';
import { pushStep, saveRunState, upsertRunAsset } from './state';

type ApplyOptions = {
  baseUrl: string;
  planPath: string;
  planDir: string;
  plan: AdminCliPlan;
  accessToken?: string;
  run: RunState;
};

function normalizeStatus(value: string | undefined): 'draft' | 'published' {
  return value === 'published' ? 'published' : 'draft';
}

async function resolveYear(
  client: AdminApiClient,
  plan: AdminCliPlan,
  run: RunState
): Promise<YearRecord> {
  const years = await client.listYears();
  const existing = years.find((year) => year.label === plan.year.label);
  if (existing) {
    run.yearId = existing.id;
    pushStep(run, `Resolved year ${plan.year.label} -> ${existing.id}`);
    return existing;
  }

  const created = await client.createYear({
    label: plan.year.label,
    status: normalizeStatus(plan.year.status),
    order_index: plan.year.order_index,
  });
  run.yearId = created.id;
  pushStep(run, `Created year ${plan.year.label} -> ${created.id}`);
  return created;
}

async function resolveLocation(
  client: AdminApiClient,
  yearId: string,
  plan: AdminCliPlan,
  run: RunState
): Promise<LocationRecord | null> {
  if (!plan.location) {
    return null;
  }

  const locations = await client.listLocations(yearId);
  const existing = locations.find((location) => location.slug === plan.location?.slug);
  if (existing) {
    run.locationId = existing.id;
    pushStep(run, `Resolved location ${plan.location.slug} -> ${existing.id}`);
    return existing;
  }

  const created = await client.createLocation(yearId, {
    name: plan.location.name,
    slug: plan.location.slug,
    summary: plan.location.summary ?? null,
    order_index: plan.location.order_index,
  });
  run.locationId = created.id;
  pushStep(run, `Created location ${plan.location.slug} -> ${created.id}`);
  return created;
}

async function resolveCollection(
  client: AdminApiClient,
  yearId: string,
  locationId: string | undefined,
  plan: AdminCliPlan,
  run: RunState
): Promise<CollectionRecord> {
  const collections = await client.listCollections(yearId);
  const existing = collections.find((collection) => collection.slug === plan.collection.slug);

  if (existing) {
    const updated = await client.updateCollection(existing.id, {
      slug: plan.collection.slug,
      title: plan.collection.title,
      summary: plan.collection.summary ?? null,
      status: normalizeStatus(plan.collection.status),
      order_index: plan.collection.order_index,
      captured_at: plan.collection.captured_at ?? null,
    });
    if (locationId) {
      await client.assignCollectionLocation(existing.id, locationId);
    }
    run.collectionId = updated.id;
    pushStep(run, `Updated collection ${plan.collection.slug} -> ${updated.id}`);
    return updated;
  }

  const created = await client.createCollection(yearId, {
    slug: plan.collection.slug,
    title: plan.collection.title,
    summary: plan.collection.summary ?? null,
    status: normalizeStatus(plan.collection.status),
    order_index: plan.collection.order_index,
    location_id: locationId,
    captured_at: plan.collection.captured_at ?? null,
  });
  run.collectionId = created.id;
  pushStep(run, `Created collection ${plan.collection.slug} -> ${created.id}`);
  return created;
}

function buildAssetAlt(asset: AssetPlan): string {
  if (asset.alt && asset.alt.trim()) {
    return asset.alt.trim();
  }
  return filenameToLabel(path.basename(asset.file));
}

async function applyAsset(
  client: AdminApiClient,
  asset: AssetPlan,
  locationId: string | undefined,
  planDir: string,
  run: RunState
): Promise<string> {
  const absoluteFilePath = path.resolve(planDir, asset.file);
  await ensureFileExists(absoluteFilePath);

  const assetId = asset.id ?? (await computeStableAssetId(absoluteFilePath));
  const size =
    asset.width && asset.height
      ? { width: asset.width, height: asset.height }
      : await getImageSize(absoluteFilePath);

  await client.uploadOriginal(absoluteFilePath, assetId);
  upsertRunAsset(run, {
    file: asset.file,
    absoluteFilePath,
    assetId,
    width: size.width,
    height: size.height,
    uploaded: true,
    message: 'uploaded original image',
  });
  await saveRunState(run);

  try {
    await client.createAsset({
      id: assetId,
      alt: buildAssetAlt(asset),
      caption: asset.caption ?? null,
      description: asset.description ?? null,
      title: asset.title ?? null,
      photographer: asset.photographer ?? null,
      location: asset.location ?? null,
      tags: asset.tags ?? null,
      width: size.width,
      height: size.height,
      metadata_json: asset.metadata_json ?? null,
      location_id: locationId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('409')) {
      throw error;
    }
  }

  await client.updateAsset(assetId, {
    alt: buildAssetAlt(asset),
    caption: asset.caption ?? null,
    description: asset.description ?? null,
    title: asset.title ?? null,
    photographer: asset.photographer ?? null,
    location: asset.location ?? null,
    tags: asset.tags ?? null,
    width: size.width,
    height: size.height,
    metadata_json: asset.metadata_json ?? null,
    location_id: locationId,
  });

  upsertRunAsset(run, {
    file: asset.file,
    absoluteFilePath,
    assetId,
    width: size.width,
    height: size.height,
    uploaded: true,
    assetCreated: true,
    message: 'created or updated asset metadata',
  });
  await saveRunState(run);
  return assetId;
}

export async function applyPlan(
  options: ApplyOptions
): Promise<{ runStatePath: string; tokenSource: string }> {
  const { baseUrl, plan, planDir, planPath, accessToken, run } = options;
  const { token, source } = await resolveAccessToken(baseUrl, accessToken);
  const client = new AdminApiClient(baseUrl, token);

  try {
    pushStep(run, `Starting apply for ${planPath}`);
    const year = await resolveYear(client, plan, run);
    await saveRunState(run);

    const location = await resolveLocation(client, year.id, plan, run);
    await saveRunState(run);

    const collection = await resolveCollection(client, year.id, location?.id, plan, run);
    await saveRunState(run);

    const assetIdsByFile = new Map<string, string>();
    const attachableAssets: string[] = [];
    let coverAssetId: string | undefined;

    for (const asset of plan.assets) {
      const assetId = await applyAsset(client, asset, location?.id, planDir, run);
      assetIdsByFile.set(asset.file, assetId);
      if (asset.attach !== false) {
        attachableAssets.push(assetId);
      }
      if (asset.is_cover) {
        coverAssetId = assetId;
      }
    }

    if (attachableAssets.length > 0) {
      await client.attachAssets(collection.id, attachableAssets);
      pushStep(run, `Attached ${attachableAssets.length} assets to collection ${collection.id}`);
      for (const asset of plan.assets) {
        if (asset.attach === false) {
          continue;
        }
        const assetId = assetIdsByFile.get(asset.file);
        if (!assetId) {
          continue;
        }
        upsertRunAsset(run, {
          file: asset.file,
          absoluteFilePath: path.resolve(planDir, asset.file),
          assetId,
          attached: true,
          message: 'attached to collection',
        });
      }
      await saveRunState(run);
    }

    const explicitOrder = plan.assets
      .filter(
        (asset) =>
          asset.attach !== false &&
          typeof asset.order_index === 'string' &&
          asset.order_index.trim() !== ''
      )
      .map((asset) => ({
        asset_id: assetIdsByFile.get(asset.file),
        order_index: asset.order_index as string,
      }))
      .filter(
        (item): item is { asset_id: string; order_index: string } =>
          typeof item.asset_id === 'string'
      );

    if (explicitOrder.length > 0) {
      await client.reorderAssets(collection.id, explicitOrder);
      pushStep(run, `Reordered ${explicitOrder.length} collection assets`);
      await saveRunState(run);
    }

    await client.updateCollection(collection.id, {
      slug: plan.collection.slug,
      title: plan.collection.title,
      summary: plan.collection.summary ?? null,
      status: normalizeStatus(plan.collection.status),
      order_index: plan.collection.order_index,
      captured_at: plan.collection.captured_at ?? null,
      cover_asset_id: coverAssetId ?? undefined,
    });
    run.coverAssetId = coverAssetId;
    run.status = 'completed';
    run.finishedAt = nowIso();
    pushStep(run, `Finished apply for collection ${collection.id}`);
    const runStatePath = await saveRunState(run);
    return { runStatePath, tokenSource: source };
  } catch (error) {
    run.status = 'failed';
    run.finishedAt = nowIso();
    run.error = error instanceof Error ? error.message : String(error);
    await saveRunState(run);
    throw error;
  }
}
