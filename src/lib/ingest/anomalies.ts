import type { PoLineInput, PrGrLineInput } from "@/lib/csv/types";

export type Warning = { row: number; message: string };

const PLAUSIBLE_YEAR_MIN = 2015;
const PLAUSIBLE_YEAR_MAX = 2035;

function yearOf(isoDate: string): number {
  return Number(isoDate.slice(0, 4));
}

/** Non-blocking data-quality warnings for PO rows (row = 1-based data row). */
export function detectPoAnomalies(rows: readonly PoLineInput[]): Warning[] {
  const warnings: Warning[] = [];
  rows.forEach((r, i) => {
    const row = i + 2; // +1 header, +1 one-based
    if (r.prDate && r.poDate < r.prDate) {
      warnings.push({
        row,
        message: `PO ${r.poNo} dated ${r.poDate} precedes its PR ${r.prNo} dated ${r.prDate}`,
      });
    }
    if (r.eta) {
      const y = yearOf(r.eta);
      if (y < PLAUSIBLE_YEAR_MIN || y > PLAUSIBLE_YEAR_MAX) {
        warnings.push({
          row,
          message: `PO ${r.poNo} has implausible ETA ${r.eta}`,
        });
      }
    }
  });
  return warnings;
}

/** Non-blocking data-quality warnings for PR-to-GR rows. */
export function detectPrGrAnomalies(
  rows: readonly PrGrLineInput[],
): Warning[] {
  const warnings: Warning[] = [];
  rows.forEach((r, i) => {
    const row = i + 2;
    if (r.prToPoDays !== null && r.prToPoDays < 0) {
      warnings.push({
        row,
        message: `PR ${r.prNo} has negative PR→PO days (${r.prToPoDays})`,
      });
    }
    if (r.poToGrpoDays !== null && r.poToGrpoDays < 0) {
      warnings.push({
        row,
        message: `PO ${r.poNo ?? "?"} has negative PO→GRPO days (${r.poToGrpoDays})`,
      });
    }
    if (r.qtyGrpo !== null && r.qtyPo !== null && r.qtyGrpo > r.qtyPo) {
      warnings.push({
        row,
        message: `PR ${r.prNo} item ${r.itemCode}: received qty ${r.qtyGrpo} exceeds PO qty ${r.qtyPo}`,
      });
    }
  });
  return warnings;
}
