import fs from 'node:fs/promises';
import path from 'node:path';

import type {
  AdminCliPlan,
  AssetPlan,
  CliConstraints,
  CollectionPlan,
  LocationPlan,
  YearPlan,
} from '../types';
import {
  ensureOptionalBoolean,
  ensureOptionalNumber,
  ensureOptionalObject,
  ensureOptionalString,
  ensureString,
  isObject,
} from '../utils';

function parseConstraints(value: unknown): CliConstraints | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isObject(value)) {
    throw new Error('constraints must be an object');
  }

  const allowDelete = ensureOptionalBoolean(value.allowDelete, 'constraints.allowDelete');
  const allowDetach = ensureOptionalBoolean(value.allowDetach, 'constraints.allowDetach');
  const allowAutoCapturedAt = ensureOptionalBoolean(
    value.allowAutoCapturedAt,
    'constraints.allowAutoCapturedAt'
  );

  if (allowDelete === true) {
    throw new Error('CLI delete operations are disabled; constraints.allowDelete cannot be true');
  }
  if (allowDetach === true) {
    throw new Error('CLI detach operations are disabled; constraints.allowDetach cannot be true');
  }
  if (allowAutoCapturedAt === true) {
    throw new Error('captured_at must be manual; constraints.allowAutoCapturedAt cannot be true');
  }

  return {
    allowDelete: false,
    allowDetach: false,
    allowAutoCapturedAt: false,
  };
}

function parseYear(value: unknown): YearPlan {
  if (!isObject(value)) {
    throw new Error('year must be an object');
  }

  return {
    label: ensureString(value.label, 'year.label').trim(),
    status: ensureOptionalString(value.status, 'year.status') as YearPlan['status'],
    order_index: ensureOptionalString(value.order_index, 'year.order_index') ?? undefined,
  };
}

function parseLocation(value: unknown): LocationPlan {
  if (!isObject(value)) {
    throw new Error('location must be an object');
  }

  return {
    name: ensureString(value.name, 'location.name').trim(),
    slug: ensureString(value.slug, 'location.slug').trim(),
    summary: ensureOptionalString(value.summary, 'location.summary') ?? undefined,
    order_index: ensureOptionalString(value.order_index, 'location.order_index') ?? undefined,
  };
}

function parseCollection(value: unknown): CollectionPlan {
  if (!isObject(value)) {
    throw new Error('collection must be an object');
  }

  const capturedAt = ensureOptionalString(value.captured_at, 'collection.captured_at');
  if (capturedAt && Number.isNaN(new Date(capturedAt).getTime())) {
    throw new Error('collection.captured_at must be a valid date string or null');
  }

  return {
    slug: ensureString(value.slug, 'collection.slug').trim(),
    title: ensureString(value.title, 'collection.title').trim(),
    summary: ensureOptionalString(value.summary, 'collection.summary') ?? undefined,
    status: ensureOptionalString(value.status, 'collection.status') as CollectionPlan['status'],
    order_index: ensureOptionalString(value.order_index, 'collection.order_index') ?? undefined,
    captured_at: capturedAt ?? undefined,
  };
}

function parseAsset(value: unknown, index: number): AssetPlan {
  if (!isObject(value)) {
    throw new Error(`assets[${index}] must be an object`);
  }

  return {
    file: ensureString(value.file, `assets[${index}].file`).trim(),
    id: ensureOptionalString(value.id, `assets[${index}].id`) ?? undefined,
    alt: ensureOptionalString(value.alt, `assets[${index}].alt`) ?? undefined,
    caption: ensureOptionalString(value.caption, `assets[${index}].caption`) ?? undefined,
    description:
      ensureOptionalString(value.description, `assets[${index}].description`) ?? undefined,
    title: ensureOptionalString(value.title, `assets[${index}].title`) ?? undefined,
    photographer:
      ensureOptionalString(value.photographer, `assets[${index}].photographer`) ?? undefined,
    location: ensureOptionalString(value.location, `assets[${index}].location`) ?? undefined,
    tags: ensureOptionalString(value.tags, `assets[${index}].tags`) ?? undefined,
    metadata_json:
      ensureOptionalObject(value.metadata_json, `assets[${index}].metadata_json`) ?? undefined,
    width: ensureOptionalNumber(value.width, `assets[${index}].width`),
    height: ensureOptionalNumber(value.height, `assets[${index}].height`),
    attach: ensureOptionalBoolean(value.attach, `assets[${index}].attach`),
    order_index:
      ensureOptionalString(value.order_index, `assets[${index}].order_index`) ?? undefined,
    is_cover: ensureOptionalBoolean(value.is_cover, `assets[${index}].is_cover`),
  };
}

export function validatePlan(value: unknown): AdminCliPlan {
  if (!isObject(value)) {
    throw new Error('plan root must be an object');
  }
  if (value.version !== 1) {
    throw new Error('plan.version must be 1');
  }
  if (!Array.isArray(value.assets) || value.assets.length === 0) {
    throw new Error('plan.assets must contain at least one entry');
  }

  const plan: AdminCliPlan = {
    version: 1,
    baseUrl: ensureOptionalString(value.baseUrl, 'baseUrl') ?? undefined,
    constraints: parseConstraints(value.constraints),
    year: parseYear(value.year),
    location: value.location === undefined ? undefined : parseLocation(value.location),
    collection: parseCollection(value.collection),
    assets: value.assets.map((asset, index) => parseAsset(asset, index)),
  };

  const coverCount = plan.assets.filter((asset) => asset.is_cover).length;
  if (coverCount > 1) {
    throw new Error('plan.assets can only mark one asset as is_cover=true');
  }
  const coverWithoutAttach = plan.assets.find((asset) => asset.is_cover && asset.attach === false);
  if (coverWithoutAttach) {
    throw new Error(`cover asset must stay attached to the collection: ${coverWithoutAttach.file}`);
  }

  if (!['draft', 'published', undefined].includes(plan.year.status)) {
    throw new Error('year.status must be draft or published');
  }
  if (!['draft', 'published', undefined].includes(plan.collection.status)) {
    throw new Error('collection.status must be draft or published');
  }

  return plan;
}

export async function loadPlan(
  planPath: string
): Promise<{ plan: AdminCliPlan; resolvedPlanPath: string; planDir: string }> {
  const resolvedPlanPath = path.resolve(planPath);
  const planDir = path.dirname(resolvedPlanPath);
  const rawText = await fs.readFile(resolvedPlanPath, 'utf8');
  const rawJson = JSON.parse(rawText) as unknown;
  const plan = validatePlan(rawJson);
  return { plan, resolvedPlanPath, planDir };
}

export async function writePlan(planPath: string, plan: AdminCliPlan): Promise<void> {
  const resolvedPath = path.resolve(planPath);
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
}

export function summarizePlan(plan: AdminCliPlan): string[] {
  const cover = plan.assets.find((asset) => asset.is_cover);
  return [
    `Year: ${plan.year.label}`,
    `Location: ${plan.location ? `${plan.location.name} (${plan.location.slug})` : 'none'}`,
    `Collection: ${plan.collection.title} (${plan.collection.slug})`,
    `Assets: ${plan.assets.length}`,
    `Cover: ${cover ? cover.file : 'none'}`,
    `Captured at: ${plan.collection.captured_at ?? 'unset'}`,
    'Delete operations: disabled',
  ];
}
