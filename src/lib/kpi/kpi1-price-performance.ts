import { inRange } from "./months";
import type { DateRange, KpiDataset, KpiMeasure } from "./types";

export type PricePerformanceDetail = {
  poNo: string;
  poDate: string;
  itemCode: string | null;
  itemNamePo: string;
  currency: string | null;
  prevPrice: number;
  price: number;
  deltaPct: number;
};

/**
 * KPI 1 — Price performance vs last PO (STD min –1%).
 * Items are identified by item code + item name (codes come from the PR TO GR
 * export, matched on item name). Each PO line in the period is compared
 * exactly to the immediately-previous PO of the same item; REAL = average %
 * change (negative = cheaper = good). Comparisons across different currencies
 * are skipped.
 */
export function calculatePricePerformance(
  dataset: KpiDataset,
  range: DateRange,
): KpiMeasure & { details: PricePerformanceDetail[] } {
  const codeByName = new Map<string, string>();
  for (const g of dataset.prGrRows) {
    if (g.itemName && !codeByName.has(g.itemName)) {
      codeByName.set(g.itemName, g.itemCode);
    }
  }

  const priced = dataset.poRows
    .filter((r) => r.unitPrice !== null && r.unitPrice > 0)
    .sort((a, b) =>
      a.poDate === b.poDate
        ? a.poNo.localeCompare(b.poNo)
        : a.poDate.localeCompare(b.poDate),
    );

  const lastByItem = new Map<string, { price: number; currency: string | null }>();
  const details: PricePerformanceDetail[] = [];
  for (const row of priced) {
    const code = codeByName.get(row.itemNamePo) ?? null;
    const key = code !== null ? `code:${code}|${row.itemNamePo}` : `name:${row.itemNamePo}`;
    const prev = lastByItem.get(key);
    if (
      prev !== undefined &&
      prev.currency === row.currency &&
      inRange(row.poDate, range)
    ) {
      details.push({
        poNo: row.poNo,
        poDate: row.poDate,
        itemCode: code,
        itemNamePo: row.itemNamePo,
        currency: row.currency,
        prevPrice: prev.price,
        price: row.unitPrice!,
        deltaPct: ((row.unitPrice! - prev.price) / prev.price) * 100,
      });
    }
    lastByItem.set(key, { price: row.unitPrice!, currency: row.currency });
  }

  if (details.length === 0) return { real: null, sampleSize: 0, details };
  const avg = details.reduce((a, d) => a + d.deltaPct, 0) / details.length;
  return { real: avg, sampleSize: details.length, details };
}
