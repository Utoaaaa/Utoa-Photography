/** D1 rejects statements that bind more than 100 parameters. */
export const D1_MAX_BOUND_PARAMETERS = 100;

/**
 * Runs `sql(placeholders)` once per chunk of `values` (each chunk within D1's bound-parameter
 * limit) in a single batch round trip, and concatenates the rows. Only use it for queries whose
 * rows depend on one value each (plain IN filters, or GROUP BY on the IN column).
 */
export async function selectIn<Row>(
  db: Pick<D1Database, 'prepare' | 'batch'>,
  sql: (placeholders: string) => string,
  values: readonly unknown[],
): Promise<Row[]> {
  if (values.length === 0) return [];
  const statements = [];
  for (let start = 0; start < values.length; start += D1_MAX_BOUND_PARAMETERS) {
    const chunk = values.slice(start, start + D1_MAX_BOUND_PARAMETERS);
    statements.push(db.prepare(sql(chunk.map(() => '?').join(', '))).bind(...chunk));
  }
  const results = await db.batch<Row>(statements);
  return results.flatMap((result) => result.results ?? []);
}
