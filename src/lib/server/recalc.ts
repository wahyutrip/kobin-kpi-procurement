import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { kpiMonthlyResults } from "@/lib/db/schema";
import { computeKpiMatrix } from "@/lib/kpi/engine";
import type { KpiMatrix } from "@/lib/kpi/types";
import { loadKpiDataset, loadKpiDefinitions } from "./dataset";

const numStr = (n: number | null): string | null =>
  n === null ? null : String(n);

/** Recompute the full KPI matrix and persist per-month results. */
export async function recalculateKpis(): Promise<KpiMatrix> {
  const db = getDb();
  const [dataset, defs] = await Promise.all([
    loadKpiDataset(),
    loadKpiDefinitions(),
  ]);
  const matrix = computeKpiMatrix(dataset, defs);

  const values = matrix.months.flatMap((m) =>
    m.cells.map((c) => ({
      month: `${m.period}-01`,
      kpiId: c.kpiId,
      realValue: numStr(c.real),
      stdValue: String(c.std),
      achievementPct: numStr(c.pct),
      capai: numStr(c.capai),
      sampleSize: c.sampleSize,
    })),
  );
  if (values.length > 0) {
    await db
      .insert(kpiMonthlyResults)
      .values(values)
      .onConflictDoUpdate({
        target: [kpiMonthlyResults.month, kpiMonthlyResults.kpiId],
        set: {
          realValue: sql`excluded.real_value`,
          stdValue: sql`excluded.std_value`,
          achievementPct: sql`excluded.achievement_pct`,
          capai: sql`excluded.capai`,
          sampleSize: sql`excluded.sample_size`,
          calculatedAt: sql`now()`,
        },
      });
  }
  return matrix;
}
