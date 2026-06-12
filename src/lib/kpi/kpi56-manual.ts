import { inRange } from "./months";
import type { DateRange, KpiDataset, KpiMeasure } from "./types";

/**
 * KPI 5 (Quality/LKM) & KPI 6 (Material substitution) — fed by a future data
 * source via `kpi_manual_entries`. REAL = sum of entry values whose month falls
 * in the period; null (no data) when there are no entries at all.
 */
export function calculateManualKpi(
  dataset: KpiDataset,
  range: DateRange,
  kpiId: number,
): KpiMeasure {
  const entries = dataset.manualEntries.filter(
    (e) => e.kpiId === kpiId && inRange(e.month, range),
  );
  if (entries.length === 0) return { real: null, sampleSize: 0 };
  const total = entries.reduce((sum, e) => sum + e.value, 0);
  return { real: total, sampleSize: entries.length };
}
