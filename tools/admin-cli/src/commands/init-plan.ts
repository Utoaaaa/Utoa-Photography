import path from 'node:path';

import type { ParsedArgs } from '../core/args';
import { listImageFiles } from '../core/files';
import { writePlan } from '../core/plan';
import type { AdminCliPlan } from '../types';
import { filenameToLabel, slugify, toPosixRelative } from '../utils';

function requireOption(options: ParsedArgs['options'], key: string): string {
  const value = options[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required option --${key}`);
  }
  return value.trim();
}

export async function runInitPlanCommand(args: ParsedArgs): Promise<void> {
  const sourceDir = args.positionals[0];
  if (!sourceDir) {
    throw new Error('Usage: init-plan <directory> --year 2024 --collection-title "Title"');
  }

  const year = requireOption(args.options, 'year');
  const collectionTitle = requireOption(args.options, 'collection-title');
  const rootDir = path.resolve(sourceDir);
  const files = await listImageFiles(rootDir);
  if (files.length === 0) {
    throw new Error(`No image files found in ${rootDir}`);
  }

  const cwd = process.cwd();
  const outputPath =
    typeof args.options.output === 'string'
      ? path.resolve(String(args.options.output))
      : path.resolve('.utoa', 'plans', `${slugify(collectionTitle) || 'plan'}.json`);
  const locationName =
    typeof args.options['location-name'] === 'string'
      ? String(args.options['location-name']).trim()
      : undefined;
  const locationSlug =
    typeof args.options['location-slug'] === 'string'
      ? String(args.options['location-slug']).trim()
      : undefined;

  const plan: AdminCliPlan = {
    version: 1,
    baseUrl:
      typeof args.options['base-url'] === 'string'
        ? String(args.options['base-url']).trim()
        : undefined,
    constraints: {
      allowDelete: false,
      allowDetach: false,
      allowAutoCapturedAt: false,
    },
    year: {
      label: year,
      status: 'draft',
    },
    location:
      locationName && locationSlug
        ? {
            name: locationName,
            slug: locationSlug,
          }
        : undefined,
    collection: {
      slug:
        typeof args.options['collection-slug'] === 'string'
          ? String(args.options['collection-slug']).trim()
          : slugify(collectionTitle),
      title: collectionTitle,
      status: 'draft',
      captured_at:
        typeof args.options['captured-at'] === 'string'
          ? String(args.options['captured-at']).trim()
          : null,
    },
    assets: files.map((filePath, index) => ({
      file: toPosixRelative(path.dirname(outputPath), filePath),
      alt: filenameToLabel(path.basename(filePath)),
      metadata_json: {
        sourceFilename: path.basename(filePath),
      },
      is_cover: index === 0,
    })),
  };

  await writePlan(outputPath, plan);

  console.log(`Plan written: ${toPosixRelative(cwd, outputPath)}`);
  console.log(`Assets discovered: ${plan.assets.length}`);
  console.log('Delete operations: disabled');
}
