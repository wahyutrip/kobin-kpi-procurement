import { describe, expect, it } from "vitest";
import { KPI_CONFIG_DEFAULTS } from "./config-defaults";
import { computeKpiMatrix, datasetMonths } from "./engine";
import type { KpiDataset } from "./types";

const dataset: KpiDataset = {
  poRows: [
    {
      poNo: "PO1",
      poDate: "2026-01-10",
      lokalImpor: "Lokal",
      eta: "2026-01-15",
      currency: "IDR",
      itemNamePo: "ITEM A",
      unitPrice: 100,
      vendorCode: "S1",
    },
    {
      poNo: "PO2",
      poDate: "2026-02-05",
      lokalImpor: "Lokal",
      eta: "2026-02-10",
      currency: "IDR",
      itemNamePo: "ITEM A",
      unitPrice: 99,
      vendorCode: "S2",
    },
  ],
  prGrRows: [
    {
      prNo: "PR1",
      prDate: "2026-01-05",
      itemCode: "C1",
      itemName: "ITEM A",
      poNo: "PO1",
      prToPoDays: 5,
      grpoNo: "G1",
      grpoDate: "2026-01-18",
    },
    {
      prNo: "PR2",
      prDate: "2026-02-03",
      itemCode: "C1",
      itemName: "ITEM A",
      poNo: "PO2",
      prToPoDays: 2,
      grpoNo: "G2",
      grpoDate: "2026-02-12",
    },
  ],
  vendors: [
    { vendorCode: "S1", firstPoDate: "2026-01-10" },
    { vendorCode: "S2", firstPoDate: "2026-02-05" },
  ],
  manualEntries: [],
};

const CTX = { today: "2026-03-01" };

describe("datasetMonths", () => {
  it("pads every data year to a full Jan–Dec", () => {
    const months = datasetMonths(dataset);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2026-01");
    expect(months[11]).toBe("2026-12");
  });
});

describe("computeKpiMatrix", () => {
  const matrix = computeKpiMatrix(dataset, KPI_CONFIG_DEFAULTS, CTX);

  it("produces all twelve months plus a YTD per year", () => {
    expect(matrix.months).toHaveLength(12);
    expect(matrix.ytd.map((y) => y.period)).toEqual(["2026-YTD"]);
  });

  it("scores January: PR→PO 100%, PO→BPB local 100%, 1 new vendor", () => {
    const jan = matrix.months[0];
    const cell = (id: number) => jan.cells.find((c) => c.kpiId === id)!;
    expect(cell(4).real).toBe(100);
    expect(cell(4).capai).toBe(15);
    expect(cell(2).real).toBe(100);
    expect(cell(2).capai).toBe(20);
    // yearly cumulative: 1 vendor by Jan vs target 6
    expect(cell(7).real).toBe(1);
    expect(cell(7).pct).toBeCloseTo(16.67, 1);
    // manual KPIs have no data
    expect(cell(5).capai).toBeNull();
    expect(cell(6).capai).toBeNull();
  });

  it("scores February price performance: 99 vs 100 = -1% → full points", () => {
    const feb = matrix.months[1];
    const k1 = feb.cells.find((c) => c.kpiId === 1)!;
    expect(k1.real).toBeCloseTo(-1, 4);
    expect(k1.pct).toBe(100);
    expect(k1.capai).toBe(10);
  });

  it("returns fully blank cells for padded months without monthly data", () => {
    const june = matrix.months[5];
    expect(june.period).toBe("2026-06");
    expect(june.cells.every((c) => c.real === null)).toBe(true);
    expect(june.total).toBe(0);
  });

  it("accumulates yearly KPIs by February (2 vendors)", () => {
    const feb = matrix.months[1];
    expect(feb.cells.find((c) => c.kpiId === 7)!.real).toBe(2);
  });

  it("computes YTD over the full year range", () => {
    const ytd = matrix.ytd[0];
    expect(ytd.cells.find((c) => c.kpiId === 7)!.real).toBe(2);
    expect(ytd.cells.find((c) => c.kpiId === 4)!.real).toBe(100);
  });

  it("totals only cells with data", () => {
    const jan = matrix.months[0];
    const expected = jan.cells.reduce((s, c) => s + (c.capai ?? 0), 0);
    expect(jan.total).toBeCloseTo(expected, 2);
  });
});
