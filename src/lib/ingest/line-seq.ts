/**
 * Source exports contain repeated natural-key lines (split deliveries, partial
 * receipts). Assign each row an occurrence index within its key group, in file
 * order, so (naturalKey, lineSeq) is unique and re-uploads stay idempotent.
 */
export function withLineSeq<T>(
  rows: readonly T[],
  keyOf: (row: T) => string,
): Array<T & { lineSeq: number }> {
  const counters = new Map<string, number>();
  return rows.map((row) => {
    const key = keyOf(row);
    const seq = counters.get(key) ?? 0;
    counters.set(key, seq + 1);
    return { ...row, lineSeq: seq };
  });
}
