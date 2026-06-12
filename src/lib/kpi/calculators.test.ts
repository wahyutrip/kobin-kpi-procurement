import { describe, expect, it } from "vitest";
import { calculatePricePerformance } from "./kpi1-price-performance";
import { calculatePoToBpb } from "./kpi23-po-to-bpb";
import { calculatePrToPo } from "./kpi4-pr-to-po";
import { calculateManualKpi } from "./kpi56-manual";
import { calculateNewVendors } from "./kpi7-new-vendors";
import { monthRange } from "./months";
import type { KpiDataset, PoRow, PrGrRow } from "./types";

const po = (over: Partial<PoRow>): PoRow => ({
  poNo: "PO1",
  poDate: "2026-01-10",
  lokalImpor: "Lokal",
  eta: "2026-01-20",
  currency: "IDR",
  itemNamePo: "ITEM A",
  unitPrice: 100,
  vendorCode: "S1",
  ...over,
});

const gr = (over: Partial<PrGrRow>): PrGrRow => ({
  prNo: "PR1",
  prDate: "2026-01-05",
  itemCode: "C1",
  itemName: "ITEM A",
  poNo: "PO1",
  prToPoDays: 3,
  grpoNo: "G1",
  grpoDate: "2026-01-21",
  ...over,
});

const emptyDataset: KpiDataset = {
  poRows: [],
  prGrRows: [],
  vendors: [],
  manualEntries: [],
};

const JAN = monthRange("2026-01");
const TODAY = "2026-03-01";

describe("KPI1 price performance", () => {
  it("compares each PO to the immediately-previous PO of the same item", () => {
    const dataset: KpiDataset = {
      ...emptyDataset,
      poRows: [
        po({ poNo: "A", poDate: "2025-12-01", unitPrice: 100 }),
        po({ poNo: "B", poDate: "2026-01-10", unitPrice: 99 }), // -1% vs A
        po({ poNo: "C", poDate: "2026-01-20", unitPrice: 100.98 }), // +2% vs B
      ],
    };
    const m = calculatePricePerformance(dataset, JAN);
    expect(m.sampleSize).toBe(2);
    expect(m.real).toBeCloseTo((-1 + 2) / 2, 5);
  });

  it("identifies items by code+name when the PR TO GR export knows the code", () => {
    const dataset: KpiDataset = {
      ...emptyDataset,
      poRows: [
        po({ poNo: "A", poDate: "2025-12-01", unitPrice: 100 }),
        po({ poNo: "B", poDate: "2026-01-10", unitPrice: 90 }),
      ],
      prGrRows: [gr({ itemName: "ITEM A", itemCode: "1010.0001" })],
    };
    const m = calculatePricePerformance(dataset, JAN);
    expect(m.real).toBeCloseTo(-10, 5);
    expect(m.details[0].itemCode).toBe("1010.0001");
    expect(m.details[0].prevPoNo).toBe("A");
    expect(m.details[0].prevPoDate).toBe("2025-12-01");
  });

  it("skips comparisons across different currencies", () => {
    const dataset: KpiDataset = {
      ...emptyDataset,
      poRows: [
        po({ poNo: "A", poDate: "2025-12-01", unitPrice: 100, currency: "IDR" }),
        po({ poNo: "B", poDate: "2026-01-10", unitPrice: 60, currency: "USD" }),
      ],
    };
    expect(calculatePricePerformance(dataset, JAN).real).toBeNull();
  });

  it("returns null when no item has a prior PO", () => {
    const dataset: KpiDataset = {
      ...emptyDataset,
      poRows: [po({ poNo: "A", poDate: "2026-01-05" })],
    };
    expect(calculatePricePerformance(dataset, JAN).real).toBeNull();
  });
});

describe("KPI2/3 PO to BPB (merged_data column AG semantics)", () => {
  it("received within ETA + tolerance is on time, attributed to PO month", () => {
    const dataset: KpiDataset = {
      ...emptyDataset,
      poRows: [
        po({ poNo: "PO1", poDate: "2026-01-10", eta: "2026-01-15" }),
        po({ poNo: "PO2", poDate: "2026-01-12", eta: "2026-01-15", itemNamePo: "ITEM B" }),
      ],
      prGrRows: [
        gr({ poNo: "PO1", grpoDate: "2026-01-20" }), // ≤ 15+7 → on time
        gr({ itemCode: "C2", poNo: "PO2", grpoDate: "2026-01-30" }), // late
      ],
    };
    const m = calculatePoToBpb(dataset, JAN, "Lokal", 7, TODAY);
    expect(m.sampleSize).toBe(2);
    expect(m.real).toBe(50);
  });

  it("uses the latest GRPO per PO when receipts are split", () => {
    const dataset: KpiDataset = {
      ...emptyDataset,
      poRows: [po({ poNo: "PO1", eta: "2026-01-15" })],
      prGrRows: [
        gr({ poNo: "PO1", grpoDate: "2026-01-16" }),
        gr({ itemCode: "C2", poNo: "PO1", grpoDate: "2026-01-30" }),
      ],
    };
    const m = calculatePoToBpb(dataset, JAN, "Lokal", 7, TODAY);
    expect(m.sampleSize).toBe(1);
    expect(m.real).toBe(0); // latest receipt 01-30 > deadline 01-22
  });

  it("not received: overdue counts as late, not-yet-due is excluded (Outstanding)", () => {
    const dataset: KpiDataset = {
      ...emptyDataset,
      poRows: [po({ poNo: "PO1", eta: "2026-01-15" })],
      // unrelated receipt establishes that the receipts export covers January
      prGrRows: [gr({ prNo: "PRX", prDate: "2026-01-02", poNo: "POX" })],
    };
    // today after deadline (01-22) → late
    const overdue = calculatePoToBpb(dataset, JAN, "Lokal", 7, "2026-02-01");
    expect(overdue.sampleSize).toBe(1);
    expect(overdue.real).toBe(0);
    expect(overdue.details[0].status).toBe("overdue_not_received");
    // today before deadline → outstanding, excluded entirely
    const pending = calculatePoToBpb(dataset, JAN, "Lokal", 7, "2026-01-20");
    expect(pending.sampleSize).toBe(0);
    expect(pending.real).toBeNull();
  });

  it("reports no data for PO months before the receipts export coverage", () => {
    const dataset: KpiDataset = {
      ...emptyDataset,
      poRows: [po({ poNo: "PO1", poDate: "2025-03-10", eta: "2025-03-20" })],
      // receipts export only starts in Nov 2025
      prGrRows: [gr({ prDate: "2025-11-21", grpoDate: "2025-11-25" })],
    };
    const m = calculatePoToBpb(dataset, monthRange("2025-03"), "Lokal", 7, TODAY);
    expect(m.real).toBeNull();
    expect(m.sampleSize).toBe(0);
  });

  it("scopes by Lokal/Impor and skips lines without ETA", () => {
    const dataset: KpiDataset = {
      ...emptyDataset,
      poRows: [
        po({ poNo: "PO1", lokalImpor: "Impor", eta: "2026-01-15" }),
        po({ poNo: "PO2", lokalImpor: "Lokal", eta: null }),
      ],
      prGrRows: [gr({ poNo: "PO1", grpoDate: "2026-01-25" })],
    };
    expect(calculatePoToBpb(dataset, JAN, "Lokal", 7, TODAY).real).toBeNull();
    expect(calculatePoToBpb(dataset, JAN, "Impor", 14, TODAY).real).toBe(100);
  });
});

describe("KPI4 PR to PO", () => {
  it("scores PR lines converted within tolerance; unfulfilled count against", () => {
    const dataset: KpiDataset = {
      ...emptyDataset,
      prGrRows: [
        gr({ prToPoDays: 3 }), // on time
        gr({ itemCode: "C2", prToPoDays: 10 }), // late
        gr({ itemCode: "C3", poNo: null, prToPoDays: null }), // unfulfilled
        gr({ itemCode: "C4", prToPoDays: -1 }), // data error → not on time
      ],
    };
    const m = calculatePrToPo(dataset, JAN, 7);
    expect(m.sampleSize).toBe(4);
    expect(m.real).toBe(25);
  });
});

describe("KPI7 new vendors", () => {
  it("counts vendors whose first PO falls inside the range", () => {
    const dataset: KpiDataset = {
      ...emptyDataset,
      vendors: [
        { vendorCode: "S1", firstPoDate: "2026-01-10" },
        { vendorCode: "S2", firstPoDate: "2025-12-31" },
      ],
    };
    expect(calculateNewVendors(dataset, JAN).real).toBe(1);
  });
});

describe("KPI5/6 manual entries", () => {
  it("sums entries in range and returns null when absent", () => {
    const dataset: KpiDataset = {
      ...emptyDataset,
      manualEntries: [
        { month: "2026-01-01", kpiId: 5, value: 2 },
        { month: "2026-01-01", kpiId: 6, value: 1 },
      ],
    };
    expect(calculateManualKpi(dataset, JAN, 5).real).toBe(2);
    expect(calculateManualKpi(dataset, JAN, 6).real).toBe(1);
    expect(calculateManualKpi(emptyDataset, JAN, 5).real).toBeNull();
  });
});
