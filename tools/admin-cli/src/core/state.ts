import fs from 'node:fs/promises';
import path from 'node:path';

import type { RunAssetState, RunState } from '../types';
import { createRunId, nowIso } from '../utils';

export async function createRunState(planPath: string, baseUrl: string): Promise<RunState> {
  return {
    version: 1,
    runId: createRunId(),
    status: 'running',
    startedAt: nowIso(),
    planPath,
    baseUrl,
    assets: [],
    steps: [],
  };
}

export function getRunStatePath(run: RunState): string {
  return path.resolve('.utoa', 'runs', `${run.runId}.json`);
}

export async function saveRunState(run: RunState): Promise<string> {
  const runStatePath = getRunStatePath(run);
  await fs.mkdir(path.dirname(runStatePath), { recursive: true });
  await fs.writeFile(runStatePath, `${JSON.stringify(run, null, 2)}\n`, 'utf8');
  return runStatePath;
}

export async function loadRunState(runStatePath: string): Promise<RunState> {
  const resolved = path.resolve(runStatePath);
  const text = await fs.readFile(resolved, 'utf8');
  return JSON.parse(text) as RunState;
}

export function pushStep(run: RunState, message: string): void {
  run.steps.push(`${nowIso()} ${message}`);
}

export function upsertRunAsset(
  run: RunState,
  next: Omit<RunAssetState, 'updatedAt'> & { updatedAt?: string }
): void {
  const index = run.assets.findIndex((asset) => asset.file === next.file);
  const value: RunAssetState = {
    ...next,
    updatedAt: next.updatedAt ?? nowIso(),
  };

  if (index >= 0) {
    run.assets[index] = { ...run.assets[index], ...value };
    return;
  }

  run.assets.push(value);
}
