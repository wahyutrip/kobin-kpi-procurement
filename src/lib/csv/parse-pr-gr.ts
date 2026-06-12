import Papa from "papaparse";
import { z } from "zod";
import {
  cleanText,
  emptyToNull,
  parseDdMmYy,
  parseInteger,
  parseNumber,
} from "./normalize";
import { toRowError } from "./parse-po";
import type { ParseResult, PrGrLineInput, RowError } from "./types";

const COL = {
  rowNum: 0,
  prNo: 1,
  prDate: 2,
  itemGroup: 3,
  itemCode: 4,
  itemName: 5,
  qtyRequested: 6,
  poNo: 7,
  poDate: 8,
  qtyPo: 9,
  prToPoDays: 10,
  grpoNo: 11,
  grpoDate: 12,
  qtyGrpo: 13,
  poToGrpoDays: 14,
} as const;

const EXPECTED_HEADER_PREFIX = ["#", "PR No", "PR Date", "Item Group"];

const prGrLineSchema = z.object({
  prNo: z.string().min(1, "PR No is required"),
  prDate: z.string().min(1, "PR Date is required"),
  itemCode: z.string().min(1, "Item Code is required"),
});

function mapRow(cells: string[]): PrGrLineInput {
  const validated = prGrLineSchema.parse({
    prNo: emptyToNull(cells[COL.prNo]) ?? "",
    prDate: parseDdMmYy(cells[COL.prDate]) ?? "",
    itemCode: emptyToNull(cells[COL.itemCode]) ?? "",
  });
  return {
    ...validated,
    itemGroup: emptyToNull(cells[COL.itemGroup]),
    itemName: cleanText(cells[COL.itemName]),
    qtyRequested: parseNumber(cells[COL.qtyRequested]),
    poNo: emptyToNull(cells[COL.poNo]),
    poDate: parseDdMmYy(cells[COL.poDate]),
    qtyPo: parseNumber(cells[COL.qtyPo]),
    prToPoDays: parseInteger(cells[COL.prToPoDays]),
    grpoNo: emptyToNull(cells[COL.grpoNo]),
    grpoDate: parseDdMmYy(cells[COL.grpoDate]),
    qtyGrpo: parseNumber(cells[COL.qtyGrpo]),
    poToGrpoDays: parseInteger(cells[COL.poToGrpoDays]),
  };
}

export function parsePrGrCsv(content: string): ParseResult<PrGrLineInput> {
  const parsed = Papa.parse<string[]>(content, { skipEmptyLines: true });
  const data = parsed.data;
  if (data.length === 0) {
    return { rows: [], errors: [{ row: 0, field: "file", message: "file is empty" }], totalRows: 0 };
  }

  const header = data[0];
  const headerOk = EXPECTED_HEADER_PREFIX.every(
    (h, i) => (header[i] ?? "").trim() === h,
  );
  if (!headerOk) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          field: "header",
          message: `unexpected header — expected columns starting with ${EXPECTED_HEADER_PREFIX.join(", ")}. Is this the PR TO GR export?`,
        },
      ],
      totalRows: data.length - 1,
    };
  }

  const rows: PrGrLineInput[] = [];
  const errors: RowError[] = [];
  for (let i = 1; i < data.length; i++) {
    try {
      rows.push(mapRow(data[i]));
    } catch (err) {
      errors.push(toRowError(i + 1, err));
    }
  }
  return { rows, errors, totalRows: data.length - 1 };
}
