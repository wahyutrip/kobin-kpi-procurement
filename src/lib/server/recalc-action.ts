"use server";

import { revalidatePath } from "next/cache";
import { recalculateKpis } from "./recalc";

export type RecalcResult = { ok: boolean; message: string };

/** Recompute all KPI results from the data already in the database. */
export async function recalcAction(): Promise<RecalcResult> {
  try {
    const matrix = await recalculateKpis();
    revalidatePath("/");
    revalidatePath("/data");
    const withData = matrix.months.filter((m) =>
      m.cells.some((c) => c.capai !== null),
    ).length;
    return {
      ok: true,
      message: `KPIs recalculated — ${withData} month(s) with data across ${matrix.months.length} month columns.`,
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? `Recalculation failed: ${err.message}`
          : "Recalculation failed unexpectedly.",
    };
  }
}
