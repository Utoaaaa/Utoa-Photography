#!/usr/bin/env ts-node
import { runApplyCommand } from './commands/apply';
import { runInitPlanCommand } from './commands/init-plan';
import { runStatusCommand } from './commands/status';
import { runValidatePlanCommand } from './commands/validate-plan';
import { parseArgs } from './core/args';

function printHelp() {
  console.log('Utoa admin CLI');
  console.log('');
  console.log('Commands:');
  console.log('  init-plan <directory> --year 2024 --collection-title "Title" [--output path]');
  console.log('  validate-plan <plan.json>');
  console.log(
    '  apply <plan.json> [--base-url https://admin.example.com] [--token <cf-access-token>]'
  );
  console.log('  status <run-state.json>');
  console.log('');
  console.log('Rules:');
  console.log('  - no delete operations');
  console.log('  - no detach operations');
  console.log('  - collection.captured_at is manual only');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  switch (args.command) {
    case 'init-plan':
      await runInitPlanCommand(args);
      return;
    case 'validate-plan':
      await runValidatePlanCommand(args);
      return;
    case 'apply':
      await runApplyCommand(args);
      return;
    case 'status':
      await runStatusCommand(args);
      return;
    case 'help':
    case '--help':
    case '-h':
    case null:
      printHelp();
      return;
    default:
      throw new Error(`Unknown command: ${args.command}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
