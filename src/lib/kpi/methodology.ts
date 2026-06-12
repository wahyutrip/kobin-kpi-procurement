import type { KpiDefinition } from "./types";

export type KpiMethodology = {
  kpiId: number;
  title: string;
  /** what this KPI measures and why */
  strategy: string;
  /** which files feed it and how they are merged */
  dataAndMerge: string[];
  /** step-by-step monthly calculation */
  steps: string[];
  /** formula lines, rendered monospace */
  formulas: string[];
  /** which month a row is counted in */
  attribution: string;
  edgeCases: string[];
};

const pctFmt = (n: number) => `${(n * 100).toFixed(0)}%`;

function scoringFormulas(def: KpiDefinition, realLabel: string): string[] {
  if (def.scoring === "threshold_max") {
    return [
      `REAL = ${realLabel}`,
      `%    = 100% if REAL ≤ ${def.stdValue} (standard "${def.stdLabel}"), otherwise 0%  — all-or-nothing`,
      `CAPAI = % × ${pctFmt(def.weight)} (weight) → max ${(def.weight * 100).toFixed(0)} points`,
    ];
  }
  return [
    `REAL = ${realLabel}`,
    `%    = REAL ÷ ${def.stdValue}${def.kpiId === 1 ? "%" : "%"} (standard "${def.stdLabel}") × 100, clamped to 0–100%`,
    `CAPAI = % × ${pctFmt(def.weight)} (weight) → max ${(def.weight * 100).toFixed(0)} points`,
    `Monthly total score = Σ CAPAI of all 7 KPIs (max 100 points)`,
  ];
}

export function getMethodology(def: KpiDefinition): KpiMethodology {
  const base = { kpiId: def.kpiId, title: def.name };
  switch (def.kpiId) {
    case 1:
      return {
        ...base,
        strategy:
          "Measures negotiation performance: is each purchase cheaper than the last time the same item was bought? The target is an average price decrease of at least 1% versus the previous PO of the same item.",
        dataAndMerge: [
          "Source: the PO export (unit price 'Harga Satuan' per PO line).",
          "Item identity = item code + item name. The PO export carries only item names, while the PR TO GR export carries both item code and name — so a name→code lookup table is built from the PR TO GR export and applied to PO lines. Items not present in PR TO GR fall back to exact item-name matching.",
          "All priced PO lines are sorted chronologically (PO date, then PO number) and walked once, remembering the most recent price per item.",
        ],
        steps: [
          "Sort every PO line with a unit price > 0 by PO date (ties broken by PO number).",
          "For each line, look up the previous PO of the same item (same item code/name).",
          "If a previous PO exists and uses the same currency, record the price change: Δ% = (price − previous price) ÷ previous price × 100. Negative Δ means cheaper — good.",
          "Take all comparisons whose PO date falls in the month; REAL = the average of their Δ%.",
          "The drill-down lists every comparison: current PO, previous PO number/date, both prices, and Δ%.",
        ],
        formulas: [
          "Δ% per line = (Harga Satuan − Harga Satuan of immediately-previous PO of the same item) ÷ previous × 100",
          "REAL = average Δ% of all comparisons in the month",
          `%    = REAL ÷ (−1%) × 100, clamped to 0–100  (e.g. REAL −0.30% → 30%; any average price increase → 0%)`,
          `CAPAI = % × ${pctFmt(def.weight)} → max ${(def.weight * 100).toFixed(0)} points`,
        ],
        attribution:
          "A comparison belongs to the month of the newer PO's date. The previous PO may be in any earlier month.",
        edgeCases: [
          "The first-ever purchase of an item has nothing to compare against and is excluded.",
          "If the same item is bought in a different currency than its previous PO, the comparison is skipped (an IDR price cannot be compared to a USD price); the new price still becomes the reference for the next purchase.",
          "Lines with missing or zero unit price are ignored.",
        ],
      };
    case 2:
    case 3: {
      const scope = def.kpiId === 2 ? "Lokal" : "Impor";
      const tol = def.toleranceDays ?? (def.kpiId === 2 ? 7 : 14);
      return {
        ...base,
        strategy: `Measures delivery reliability for ${scope === "Lokal" ? "local" : "import"} purchases: did goods physically arrive (BPB/GRPO) within the agreed ETA plus a ${tol}-day tolerance? This mirrors the merged_data sheet formula (column AG) exactly.`,
        dataAndMerge: [
          `Source A — PO export: provides per PO line the ETA, the Lokal/Impor flag (this KPI only counts "${scope}" lines), and the PO date.`,
          "Source B — PR TO GR export: provides goods-receipt (GRPO) dates.",
          "Merge: joined on PO number. Receipt date for a PO = the LATEST GRPO date among all its receipt lines — a PO delivered in several partial shipments only counts as complete when the last shipment arrives.",
          "An item-level join is not possible because the PO export identifies items by name while PR TO GR uses item codes; PO number is the reliable shared key.",
        ],
        steps: [
          `Take every PO line in the month (by PO date) with Lokal/Impor = "${scope}" and a non-empty ETA.`,
          `Compute the deadline: ETA + ${tol} days.`,
          "If the PO has a receipt: on time when latest GRPO date ≤ deadline, otherwise late.",
          "If the PO has no receipt yet: when today is already past the deadline it counts as late ('overdue — not received'); when the deadline is still in the future it is 'Outstanding' and excluded from the score entirely.",
          "REAL = on-time lines ÷ counted lines × 100.",
        ],
        formulas: scoringFormulas(
          def,
          "on-time lines ÷ (on-time + late + overdue-not-received) × 100",
        ),
        attribution:
          "A line belongs to the month of its PO date (not the receipt month) — the month the commitment was made.",
        edgeCases: [
          "Lines without an ETA cannot be evaluated and are skipped (visible as 'No ETA' on the Data page).",
          "'Outstanding' lines (not yet due) are excluded so an in-flight PO doesn't penalize the score prematurely.",
          "Months that end before the PR TO GR export's coverage begins show '–' (no data) instead of a false 0% — the receipts simply aren't in the export.",
          "The 'today' used for the overdue decision is the calculation date, so re-calculating later can turn Outstanding lines into late ones.",
        ],
      };
    }
    case 4: {
      const tol = def.toleranceDays ?? 7;
      return {
        ...base,
        strategy: `Measures purchasing responsiveness: every purchase request (PR) line should be converted into a PO within ${tol} days of the request, provided the specification is clear.`,
        dataAndMerge: [
          "Source: the PR TO GR export alone — it already links each PR line to its PO and carries the pre-computed 'PR to PO Days' column.",
          "No merge with the PO export is needed for this KPI.",
        ],
        steps: [
          "Take every PR line whose PR date falls in the month.",
          `A line is on time when it has a PO and 0 ≤ 'PR to PO Days' ≤ ${tol}.`,
          "Lines with no PO yet count against the score (they are unconverted requests).",
          "REAL = on-time lines ÷ all PR lines in the month × 100.",
        ],
        formulas: scoringFormulas(
          def,
          `PR lines converted to PO within ${tol} days ÷ all PR lines in the month × 100`,
        ),
        attribution: "A line belongs to the month of its PR date.",
        edgeCases: [
          "Negative 'PR to PO Days' values (data-entry errors, flagged as warnings at upload) are never counted as on time.",
          "Very recent PR lines that legitimately haven't been processed yet still count against the month — same as the manual report.",
        ],
      };
    }
    case 5:
      return {
        ...base,
        strategy:
          "Measures purchasing quality: the number of quality complaints (LKM) on purchased goods/materials must stay within the allowed maximum per month.",
        dataAndMerge: [
          "Source: not present in the PO or PR TO GR exports. Values come from the kpi_manual_entries table, ready for a future LKM export or manual entry.",
        ],
        steps: [
          "Sum the LKM entries recorded for the month.",
          "Score is all-or-nothing against the standard.",
        ],
        formulas: scoringFormulas(def, "number of LKM (quality complaints) in the month"),
        attribution: "Entries are recorded against a specific month.",
        edgeCases: [
          "Until the data source is connected the KPI shows '–' (no data) and contributes nothing to the total — it does not show a fake 100%.",
        ],
      };
    case 6:
      return {
        ...base,
        strategy:
          "Measures specification discipline: material substitutions (backup materials) should be rare — at most one item per year.",
        dataAndMerge: [
          "Source: not present in the PO or PR TO GR exports. Values come from the kpi_manual_entries table, ready for a future export or manual entry.",
        ],
        steps: [
          "Sum substitution entries from January 1 through the end of the month (cumulative for the year).",
          "Score is all-or-nothing against the yearly maximum.",
        ],
        formulas: scoringFormulas(
          def,
          "cumulative substitutions from Jan 1 to month end",
        ),
        attribution:
          "Cumulative year-to-date: each month shows the running total for the year.",
        edgeCases: [
          "Until the data source is connected the KPI shows '–' (no data) and contributes nothing to the total.",
        ],
      };
    case 7:
      return {
        ...base,
        strategy:
          "Measures supply-base development: finding cheaper or better alternative suppliers. Target is at least 6 genuinely new vendors per year.",
        dataAndMerge: [
          "Source: the PO export's vendor code + vendor name columns.",
          "At every upload, a vendors table records each vendor code with its FIRST-ever PO date (kept as the minimum across all uploads, so re-uploads never shift it).",
        ],
        steps: [
          "A vendor is 'new' in the period when its first-ever PO date falls inside it.",
          "REAL for a month = number of vendors whose first PO falls between Jan 1 and that month's end (cumulative for the year).",
        ],
        formulas: scoringFormulas(
          def,
          "vendors with first-ever PO between Jan 1 and month end (cumulative)",
        ),
        attribution:
          "Cumulative year-to-date, judged against the yearly target of 6.",
        edgeCases: [
          "Because the data starts in January 2025, every vendor in 2025 looks 'new' (no earlier history exists to compare against) — 2025 counts are inflated; 2026 onward is accurate. Importing a pre-2025 vendor list would fix the baseline.",
        ],
      };
    default:
      throw new Error(`No methodology for KPI ${def.kpiId}`);
  }
}

/** Shared explanation of how the two exports are merged, shown on the Data page. */
export const MERGE_EXPLANATION = {
  title: "How PO and PR TO GR are merged",
  paragraphs: [
    "The two exports describe the same purchasing flow from different angles. The PO export is line-level: one row per PR-line → PO-line pairing, carrying vendor, prices, currency, ETA and the Lokal/Impor flag. The PR TO GR export is receipt-level: one row per PR line with its PO and goods-receipt (GRPO/BPB) dates.",
    "They cannot be joined line-by-line because the PO export identifies items by free-text name while PR TO GR uses item codes. The one reliable shared key is the PO number — so this table starts from every PO line and attaches the receipt information per PO.",
    "Receipt date per PO = the LATEST GRPO date among that PO's receipt lines. A PO delivered in several partial shipments counts as complete only when the last shipment arrives — the conservative reading used by KPI 2/3.",
    "From ETA and the Lokal/Impor flag, each line gets a deadline (ETA + 7 days for Lokal, + 14 days for Impor) and a realisasi status: On time (received ≤ deadline), Late (received after), Overdue (not received and deadline passed), Outstanding (not received, deadline in the future — excluded from KPI scoring), or No ETA (cannot be evaluated).",
    "On import, rows are merged by natural key — PO lines by (PR No, PO No, item, PO date) and receipt lines by (PR No, item code, PO No, GRPO No), each with an occurrence counter for repeated lines — so re-uploading an updated export updates rows in place instead of duplicating them.",
  ],
};
