import { inRange } from "./months";
import type { DateRange, KpiDataset, KpiMeasure } from "./types";

export type PrToPoDetail = {
  prNo: string;
  itemCode: string;
  prDate: string;
  poNo: string | null;
  prToPoDays: number | null;
  onTime: boolean;
};

/**
 * KPI 4 — Realisasi PR to PO (STD 95%).
 * A PR line (attributed to its PR date month) is fulfilled on time when a PO
 * was created within `toleranceDays` (7) of the PR. Lines with no PO yet count
 * against the score.
 */
export function calculatePrToPo(
  dataset: KpiDataset,
  range: DateRange,
  toleranceDays: number,
): KpiMeasure & { details: PrToPoDetail[] } {
  const details: PrToPoDetail[] = [];
  for (const g of dataset.prGrRows) {
    if (!inRange(g.prDate, range)) continue;
    const onTime =
      g.poNo !== null &&
      g.prToPoDays !== null &&
      g.prToPoDays >= 0 &&
      g.prToPoDays <= toleranceDays;
    details.push({
      prNo: g.prNo,
      itemCode: g.itemCode,
      prDate: g.prDate,
      poNo: g.poNo,
      prToPoDays: g.prToPoDays,
      onTime,
    });
  }

  if (details.length === 0) return { real: null, sampleSize: 0, details };
  const onTime = details.filter((d) => d.onTime).length;
  return {
    real: (onTime / details.length) * 100,
    sampleSize: details.length,
    details,
  };
}
