import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { uploads } from "@/lib/db/schema";
import { computeKpiMatrix, measureKpi } from "@/lib/kpi/engine";
import { monthRange, ytdRange } from "@/lib/kpi/months";
import type { KpiDefinition, KpiMatrix } from "@/lib/kpi/types";
import { loadKpiDataset, loadKpiDefinitions } from "./dataset";

export async function getKpiMatrix(): Promise<{
  matrix: KpiMatrix;
  defs: KpiDefinition[];
}> {
  const [dataset, defs] = await Promise.all([
    loadKpiDataset(),
    loadKpiDefinitions(),
  ]);
  return { matrix: computeKpiMatrix(dataset, defs), defs };
}

export type DrilldownRow = Record<
  string,
  string | number | boolean | null
>;

/** Underlying rows justifying a KPI figure for one month. */
export async function getKpiDrilldown(
  kpiId: number,
  month: string,
): Promise<{ def: KpiDefinition; rows: DrilldownRow[] }> {
  const [dataset, defs] = await Promise.all([
    loadKpiDataset(),
    loadKpiDefinitions(),
  ]);
  const def = defs.find((d) => d.kpiId === kpiId);
  if (!def) throw new Error(`Unknown KPI ${kpiId}`);

  const range =
    def.aggregation === "yearly_cumulative" ? ytdRange(month) : monthRange(month);
  const today = new Date().toISOString().slice(0, 10);
  const measure = measureKpi(kpiId, dataset, range, def, { today });

  if ("details" in measure && Array.isArray(measure.details)) {
    return { def, rows: measure.details as DrilldownRow[] };
  }
  if (kpiId === 7) {
    const rows = dataset.vendors
      .filter((v) => v.firstPoDate >= range.from && v.firstPoDate <= range.to)
      .map((v) => ({ vendorCode: v.vendorCode, firstPoDate: v.firstPoDate }));
    return { def, rows };
  }
  // KPI 5/6 — manual entries
  const rows = dataset.manualEntries
    .filter(
      (e) => e.kpiId === kpiId && e.month >= range.from && e.month <= range.to,
    )
    .map((e) => ({ month: e.month, value: e.value }));
  return { def, rows };
}

export async function getUploadHistory() {
  const db = getDb();
  // rawContent excluded — files can be several MB each
  return db
    .select({
      id: uploads.id,
      fileType: uploads.fileType,
      fileName: uploads.fileName,
      uploadedAt: uploads.uploadedAt,
      status: uploads.status,
      stats: uploads.stats,
      validationErrors: uploads.validationErrors,
      warnings: uploads.warnings,
      hasRawContent: sql<boolean>`${uploads.rawContent} is not null`,
    })
    .from(uploads)
    .orderBy(desc(uploads.uploadedAt))
    .limit(100);
}

export async function getUploadDetail(id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: uploads.id,
      fileType: uploads.fileType,
      fileName: uploads.fileName,
      uploadedAt: uploads.uploadedAt,
      status: uploads.status,
      stats: uploads.stats,
      validationErrors: uploads.validationErrors,
      warnings: uploads.warnings,
      hasRawContent: sql<boolean>`${uploads.rawContent} is not null`,
    })
    .from(uploads)
    .where(eq(uploads.id, id))
    .limit(1);
  return row ?? null;
}
