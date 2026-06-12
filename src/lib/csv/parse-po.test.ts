import { describe, expect, it } from "vitest";
import { parsePoCsv } from "./parse-po";

const HEADER =
  "#,No. PR,Tanggal PR,Type PR,Status PR,Item Name PR,Required Quantity,Required Date,Project Code,Project Name,Request By,No. PO,Tanggal PO,Type PO,Lokal/Impor,Status PO,Vendor Name,Vendor Code,ETA,Mata Uang PO,Item Name PO,Quantity PO,UoM PO,Harga Satuan,Total PO,Outstanding PO Qty,TOP(Hari),Remarks PO,,No PR,Tgl PR,Qty PR,Qty PO,Qty BPB,Realisasi PR to PO,Realisasi PO to BPB,Price Performance";

const ROW_OK = `1,24110163,20.11.24,Item,CLOSED,VIBRATING SIEVES OD 1000 MM,4,27.11.24,,,Nanda Ayu Pratiwi,25050393,20.05.25,Item,Impor,CLOSED,"LIDE TRADING (HONG KONG) CO., LTD.",S0465,20.06.25,USD,VIBRATING SIEVES OD 1000 MM,4,SET,"3,400.00","223,788,000.00",0,Net 30,,Y,,,,,,,,`;

describe("parsePoCsv", () => {
  it("parses a valid row into normalized fields", () => {
    const result = parsePoCsv([HEADER, ROW_OK].join("\n"));
    expect(result.errors).toEqual([]);
    expect(result.totalRows).toBe(1);
    const row = result.rows[0];
    expect(row).toMatchObject({
      prNo: "24110163",
      prDate: "2024-11-20",
      poNo: "25050393",
      poDate: "2025-05-20",
      lokalImpor: "Impor",
      vendorName: "LIDE TRADING (HONG KONG) CO., LTD.",
      vendorCode: "S0465",
      eta: "2025-06-20",
      currency: "USD",
      itemNamePo: "VIBRATING SIEVES OD 1000 MM",
      qtyPo: 4,
      unitPrice: 3400,
      totalPo: 223788000,
      outstandingQty: 0,
      top: "Net 30",
    });
  });

  it("collects row errors without failing the whole file", () => {
    const badDate = ROW_OK.replace("20.05.25", "99.99.25");
    const result = parsePoCsv([HEADER, ROW_OK, badDate].join("\n"));
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(3);
  });

  it("rejects rows with missing PO number", () => {
    const noPo = ROW_OK.replace("25050393", "");
    const result = parsePoCsv([HEADER, noPo].join("\n"));
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].field).toBe("poNo");
  });

  it("rejects a file with the wrong header", () => {
    const result = parsePoCsv("a,b,c\n1,2,3");
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].field).toBe("header");
  });

  it("rejects an empty file", () => {
    const result = parsePoCsv("");
    expect(result.errors[0].message).toMatch(/empty/);
  });

  it("rejects invalid Lokal/Impor values", () => {
    const bad = ROW_OK.replace(",Impor,", ",Unknown,");
    const result = parsePoCsv([HEADER, bad].join("\n"));
    expect(result.errors[0].field).toBe("lokalImpor");
  });
});
