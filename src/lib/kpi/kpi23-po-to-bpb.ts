import { addDays, inRange } from "./months";
import type { DateRange, KpiDataset, KpiMeasure } from "./types";

export type PoToBpbStatus = "on_time" | "late" | "overdue_not_received";

export type PoToBpbDetail = {
  poNo: string;
  poDate: string;
  itemNamePo: string;
  eta: string;
  deadline: string;
  grpoDate: string | null;
  status: PoToBpbStatus;
  onTime: boolean;
};

/**
 * KPI 2/3 — Realisasi PO to BPB (STD 95%), mirroring the merged_data sheet
 * formula (column AG):
 * - per PO line with an ETA; deadline = ETA + tolerance (7 Lokal / 14 Impor)
 * - received (BPB/GRPO date present): on time when GRPO date ≤ deadline
 * - not received: counts as late once today > deadline, otherwise the line is
 *   "Outstanding" and excluded from the score
 * Lines are attributed to their PO-date month. Receipt date per PO = latest
 * GRPO date for that PO No in the PR TO GR export.
 */
export function calculatePoToBpb(
  dataset: KpiDataset,
  range: DateRange,
  scope: "Lokal" | "Impor",
  toleranceDays: number,
  today: string,
): KpiMeasure & { details: PoToBpbDetail[] } {
  const grpoByPo = new Map<string, string>();
  let coverageStart: string | null = null;
  for (const g of dataset.prGrRows) {
    const earliest = g.grpoDate && g.grpoDate < g.prDate ? g.grpoDate : g.prDate;
    if (coverageStart === null || earliest < coverageStart) {
      coverageStart = earliest;
    }
    if (!g.poNo || !g.grpoDate) continue;
    const existing = grpoByPo.get(g.poNo);
    if (!existing || g.grpoDate > existing) grpoByPo.set(g.poNo, g.grpoDate);
  }

  // PO months that predate the receipts export entirely have no BPB data —
  // report "no data" instead of counting every line as never-received.
  if (coverageStart === null || range.to < coverageStart) {
    return { real: null, sampleSize: 0, details: [] };
  }

  const details: PoToBpbDetail[] = [];
  for (const po of dataset.poRows) {
    if (po.lokalImpor !== scope || !po.eta) continue;
    if (!inRange(po.poDate, range)) continue;
    const deadline = addDays(po.eta, toleranceDays);
    const grpoDate = grpoByPo.get(po.poNo) ?? null;

    if (grpoDate === null) {
      if (today <= deadline) continue; // outstanding — not yet due, excluded
      details.push({
        poNo: po.poNo,
        poDate: po.poDate,
        itemNamePo: po.itemNamePo,
        eta: po.eta,
        deadline,
        grpoDate: null,
        status: "overdue_not_received",
        onTime: false,
      });
      continue;
    }

    const onTime = grpoDate <= deadline;
    details.push({
      poNo: po.poNo,
      poDate: po.poDate,
      itemNamePo: po.itemNamePo,
      eta: po.eta,
      deadline,
      grpoDate,
      status: onTime ? "on_time" : "late",
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
