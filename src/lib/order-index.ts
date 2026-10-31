/**
 * order_index is stored as TEXT and has been written in several formats over time
 * ("1.0", "0001", "000004", "2025.0"). Plain string order puts "10.0" before "2.0" and
 * "000004" before "0001", so compare numerically whenever both values are numbers.
 * D1 queries use the SQL equivalent: ORDER BY CAST(order_index AS REAL), order_index.
 */
export function compareOrderIndex(a: string | null | undefined, b: string | null | undefined): number {
  const left = Number.parseFloat(a ?? '');
  const right = Number.parseFloat(b ?? '');
  if (Number.isFinite(left) && Number.isFinite(right) && left !== right) return left - right;
  return (a ?? '').localeCompare(b ?? '');
}

/** Largest numeric order_index, or 0 when none is numeric. */
export function maxOrderIndex(values: Array<string | null | undefined>): number {
  return values.reduce<number>((max, value) => {
    const numeric = Number.parseFloat(value ?? '');
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 0);
}
