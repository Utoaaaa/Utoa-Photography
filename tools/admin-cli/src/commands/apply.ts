import type { ParsedArgs } from '../core/args';
import { applyPlan } from '../core/executor';
import { loadPlan, summarizePlan } from '../core/plan';
import { createRunState, getRunStatePath } from '../core/state';
import type { UploadModePreference } from '../core/upload';

function parseUploadMode(value: string | boolean | undefined): UploadModePreference {
  if (value === undefined || value === false) {
    return 'auto';
  }
  if (value === true) {
    throw new Error('Usage: --upload-mode must be one of auto, direct-r2, admin-api');
  }
  if (value === 'auto' || value === 'direct-r2' || value === 'admin-api') {
    return value;
  }
  throw new Error('Usage: --upload-mode must be one of auto, direct-r2, admin-api');
}

export async function runApplyCommand(args: ParsedArgs): Promise<void> {
  const planPath = args.positionals[0];
  if (!planPath) {
    throw new Error('Usage: apply <plan.json> [--base-url https://admin.example.com]');
  }

  const { plan, resolvedPlanPath, planDir } = await loadPlan(planPath);
  const baseUrl =
    typeof args.options['base-url'] === 'string'
      ? String(args.options['base-url']).trim()
      : plan.baseUrl || process.env.UTOA_ADMIN_BASE_URL;

  if (!baseUrl) {
    throw new Error('Missing base URL. Set plan.baseUrl, --base-url, or UTOA_ADMIN_BASE_URL');
  }

  const run = await createRunState(resolvedPlanPath, baseUrl);
  const previewPath = getRunStatePath(run);
  console.log(`Run state: ${previewPath}`);
  for (const line of summarizePlan(plan)) {
    console.log(`- ${line}`);
  }

  const result = await applyPlan({
    baseUrl,
    planPath: resolvedPlanPath,
    planDir,
    plan,
    accessToken: typeof args.options.token === 'string' ? String(args.options.token) : undefined,
    uploadMode: parseUploadMode(args.options['upload-mode']),
    run,
  });

  console.log(`Apply completed: ${result.runStatePath}`);
  console.log(`Token source: ${result.tokenSource}`);
}
