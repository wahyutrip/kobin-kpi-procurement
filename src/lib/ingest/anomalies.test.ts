import { describe, expect, it } from "vitest";
import { detectPoAnomalies, detectPrGrAnomalies } from "./anomalies";
import type { PoLineInput, PrGrLineInput } from "@/lib/csv/types";

const basePo: PoLineInput = {
  prNo: "P1",
  prDate: "2025-01-01",
  prStatus: null,
  itemNamePr: null,
  requiredQty: null,
  requiredDate: null,
  requestBy: null,
  poNo: "O1",
  poDate: "2025-01-05",
  lokalImpor: "Lokal",
  poStatus: null,
  vendorCode: "S1",
  vendorName: "VENDOR",
  eta: "2025-02-01",
  currency: "IDR",
  itemNamePo: "ITEM",
  qtyPo: 1,
  uomPo: null,
  unitPrice: 100,
  totalPo: 100,
  outstandingQty: 0,
  top: null,
  remarks: null,
};

const baseGr: PrGrLineInput = {
  prNo: "P1",
  prDate: "2025-11-21",
  itemGroup: null,
  itemCode: "C1",
  itemName: null,
  qtyRequested: 10,
  poNo: "O1",
  poDate: "2025-11-24",
  qtyPo: 10,
  prToPoDays: 3,
  grpoNo: "G1",
  grpoDate: "2025-11-25",
  qtyGrpo: 10,
  poToGrpoDays: 1,
};

describe("detectPoAnomalies", () => {
  it("flags PO dated before its PR", () => {
    const warnings = detectPoAnomalies([
      { ...basePo, poDate: "2024-12-31" },
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toMatch(/precedes its PR/);
  });

  it("flags implausible ETA years", () => {
    const warnings = detectPoAnomalies([{ ...basePo, eta: "2008-04-08" }]);
    expect(warnings[0].message).toMatch(/implausible ETA/);
  });

  it("passes clean rows", () => {
    expect(detectPoAnomalies([basePo])).toEqual([]);
  });
});

describe("detectPrGrAnomalies", () => {
  it("flags negative day counts", () => {
    const warnings = detectPrGrAnomalies([
      { ...baseGr, prToPoDays: -1, poToGrpoDays: -11 },
    ]);
    expect(warnings).toHaveLength(2);
  });

  it("flags over-receipt", () => {
    const warnings = detectPrGrAnomalies([{ ...baseGr, qtyGrpo: 12 }]);
    expect(warnings[0].message).toMatch(/exceeds PO qty/);
  });

  it("passes clean rows", () => {
    expect(detectPrGrAnomalies([baseGr])).toEqual([]);
  });
});
