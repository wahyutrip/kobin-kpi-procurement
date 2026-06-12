import { describe, expect, it } from "vitest";
import { parsePrGrCsv } from "./parse-pr-gr";

const HEADER =
  "#,PR No,PR Date,Item Group,Item Code,Item Name,Qty Requested,PO No,PO Date,PO Quantity,PR to PO Days,GRPO No,GRPO Date,GRPO Quantity,PO to GRPO Days,";

const ROW_FULL = `2,251100300,21.11.25,BAHAN BAKU GLAZE,1098.0006,PS-8000,"23,000.00",251100324,24.11.25,"6,000.00",3,251100845,25.11.25,"6,000.00",1,Y`;
const ROW_UNFULFILLED = `1,251100299,21.11.25,PERSEDIAAN UMUM,6030.2411,ROLL PIPA GALVANIS 2 INCH SCH 40,4,-,,4,,-,,0,,Y`;

describe("parsePrGrCsv", () => {
  it("parses a fulfilled row", () => {
    const result = parsePrGrCsv([HEADER, ROW_FULL].join("\n"));
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      prNo: "251100300",
      prDate: "2025-11-21",
      itemCode: "1098.0006",
      qtyRequested: 23000,
      poNo: "251100324",
      poDate: "2025-11-24",
      qtyPo: 6000,
      prToPoDays: 3,
      grpoNo: "251100845",
      grpoDate: "2025-11-25",
      qtyGrpo: 6000,
      poToGrpoDays: 1,
    });
  });

  it("maps '-' PO/GRPO to null on unfulfilled rows", () => {
    const result = parsePrGrCsv([HEADER, ROW_UNFULFILLED].join("\n"));
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      prNo: "251100299",
      poNo: null,
      poDate: null,
      prToPoDays: null,
      grpoNo: null,
      grpoDate: null,
    });
  });

  it("accepts negative day counts (data quirk) without erroring", () => {
    const negative = ROW_FULL.replace(",3,251100845", ",-1,251100845");
    const result = parsePrGrCsv([HEADER, negative].join("\n"));
    expect(result.rows[0].prToPoDays).toBe(-1);
  });

  it("rejects rows missing PR No", () => {
    const bad = ROW_FULL.replace("251100300", "");
    const result = parsePrGrCsv([HEADER, bad].join("\n"));
    expect(result.errors[0].field).toBe("prNo");
  });

  it("rejects the wrong file type by header", () => {
    const result = parsePrGrCsv("#,No. PR,Tanggal PR\n1,2,3");
    expect(result.errors[0].field).toBe("header");
  });
});
