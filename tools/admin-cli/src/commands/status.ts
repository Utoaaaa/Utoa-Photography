import type { ParsedArgs } from '../core/args';
import { loadRunState } from '../core/state';

export async function runStatusCommand(args: ParsedArgs): Promise<void> {
  const runStatePath = args.positionals[0];
  if (!runStatePath) {
    throw new Error('Usage: status <run-state.json>');
  }

  const run = await loadRunState(runStatePath);
  console.log(`Run: ${run.runId}`);
  console.log(`Status: ${run.status}`);
  console.log(`Started: ${run.startedAt}`);
  console.log(`Finished: ${run.finishedAt ?? 'running'}`);
  console.log(`Plan: ${run.planPath}`);
  console.log(`Base URL: ${run.baseUrl}`);
  console.log(`Assets tracked: ${run.assets.length}`);
  if (run.error) {
    console.log(`Error: ${run.error}`);
  }
  if (run.steps.length > 0) {
    console.log('Steps:');
    for (const step of run.steps) {
      console.log(`- ${step}`);
    }
  }
}
