import { inRange } from "./months";
import type { DateRange, KpiDataset, KpiMeasure } from "./types";

/**
 * KPI 7 — Sourcing new vendor (STD min 6 / year).
 * REAL = number of vendors whose first-ever PO date falls inside the period.
 * With the `yearly_cumulative` aggregation the engine passes a Jan-1-to-month-end
 * range, so the count accumulates over the year against the yearly target.
 */
export function calculateNewVendors(
  dataset: KpiDataset,
  range: DateRange,
): KpiMeasure {
  const count = dataset.vendors.filter((v) =>
    inRange(v.firstPoDate, range),
  ).length;
  return { real: count, sampleSize: count };
}
