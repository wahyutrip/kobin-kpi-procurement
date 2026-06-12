import type { KpiCellResult, KpiDefinition, KpiMeasure } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Convert a measured REAL into achievement % and weighted CAPAI points.
 * - ratio: pct = real/std × 100 (works for negative targets too, e.g. price
 *   performance –0.3% vs std –1% → 30%), clamped to 0–100.
 * - threshold_max: 100% while real ≤ std, else 0 (e.g. "LKM max 3").
 */
export function scoreKpi(
  def: KpiDefinition,
  measure: KpiMeasure,
): KpiCellResult {
  const base = {
    kpiId: def.kpiId,
    std: def.stdValue,
    sampleSize: measure.sampleSize,
  };
  if (measure.real === null) {
    return { ...base, real: null, pct: null, capai: null };
  }

  let pct: number;
  if (def.scoring === "threshold_max") {
    pct = measure.real <= def.stdValue ? 100 : 0;
  } else {
    pct = def.stdValue === 0 ? 0 : clamp((measure.real / def.stdValue) * 100, 0, 100);
  }
  const capai = (pct / 100) * def.weight * 100;
  return {
    ...base,
    real: round(measure.real, 4),
    pct: round(pct, 2),
    capai: round(capai, 2),
  };
}

export function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
