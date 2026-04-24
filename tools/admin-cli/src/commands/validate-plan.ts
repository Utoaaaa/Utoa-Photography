import type { ParsedArgs } from '../core/args';
import { loadPlan, summarizePlan } from '../core/plan';

export async function runValidatePlanCommand(args: ParsedArgs): Promise<void> {
  const planPath = args.positionals[0];
  if (!planPath) {
    throw new Error('Usage: validate-plan <plan.json>');
  }

  const { plan, resolvedPlanPath } = await loadPlan(planPath);
  console.log(`Plan OK: ${resolvedPlanPath}`);
  for (const line of summarizePlan(plan)) {
    console.log(`- ${line}`);
  }
}
