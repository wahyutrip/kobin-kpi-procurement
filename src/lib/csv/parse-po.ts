import Papa from "papaparse";
import { z } from "zod";
import {
  cleanText,
  emptyToNull,
  parseDdMmYy,
  parseNumber,
} from "./normalize";
import type { ParseResult, PoLineInput, RowError } from "./types";

// Positional columns of PO.csv. Headers contain duplicates and empty names,
// so parsing is index-based and the header row is verified against this list.
const COL = {
  rowNum: 0,
  prNo: 1,
  prDate: 2,
  prStatus: 4,
  itemNamePr: 5,
  requiredQty: 6,
  requiredDate: 7,
  requestBy: 10,
  poNo: 11,
  poDate: 12,
  lokalImpor: 14,
  poStatus: 15,
  vendorName: 16,
  vendorCode: 17,
  eta: 18,
  currency: 19,
  itemNamePo: 20,
  qtyPo: 21,
  uomPo: 22,
  unitPrice: 23,
  totalPo: 24,
  outstandingQty: 25,
  top: 26,
  remarks: 27,
} as const;

const EXPECTED_HEADER_PREFIX = ["#", "No. PR", "Tanggal PR", "Type PR"];

const poLineSchema = z.object({
  prNo: z.string().min(1, "No. PR is required"),
  poNo: z.string().min(1, "No. PO is required"),
  poDate: z.string().min(1, "Tanggal PO is required"),
  lokalImpor: z.enum(["Lokal", "Impor"]),
  itemNamePo: z.string().min(1, "Item Name PO is required"),
});

function mapRow(cells: string[]): PoLineInput {
  const base = {
    prNo: emptyToNull(cells[COL.prNo]) ?? "",
    poNo: emptyToNull(cells[COL.poNo]) ?? "",
    poDate: parseDdMmYy(cells[COL.poDate]) ?? "",
    lokalImpor: emptyToNull(cells[COL.lokalImpor]) ?? "",
    itemNamePo: cleanText(cells[COL.itemNamePo]) ?? "",
  };
  const validated = poLineSchema.parse(base);
  return {
    ...validated,
    prDate: parseDdMmYy(cells[COL.prDate]),
    prStatus: emptyToNull(cells[COL.prStatus]),
    itemNamePr: cleanText(cells[COL.itemNamePr]),
    requiredQty: parseNumber(cells[COL.requiredQty]),
    requiredDate: parseDdMmYy(cells[COL.requiredDate]),
    requestBy: emptyToNull(cells[COL.requestBy]),
    poStatus: emptyToNull(cells[COL.poStatus]),
    vendorCode: emptyToNull(cells[COL.vendorCode]),
    vendorName: cleanText(cells[COL.vendorName]),
    eta: parseDdMmYy(cells[COL.eta]),
    currency: emptyToNull(cells[COL.currency]),
    qtyPo: parseNumber(cells[COL.qtyPo]),
    uomPo: emptyToNull(cells[COL.uomPo]),
    unitPrice: parseNumber(cells[COL.unitPrice]),
    totalPo: parseNumber(cells[COL.totalPo]),
    outstandingQty: parseNumber(cells[COL.outstandingQty]),
    top: emptyToNull(cells[COL.top]),
    remarks: cleanText(cells[COL.remarks]),
  };
}

export function parsePoCsv(content: string): ParseResult<PoLineInput> {
  const parsed = Papa.parse<string[]>(content, {
    skipEmptyLines: true,
  });
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
          message: `unexpected header — expected columns starting with ${EXPECTED_HEADER_PREFIX.join(", ")}. Is this the PO export?`,
        },
      ],
      totalRows: data.length - 1,
    };
  }

  const rows: PoLineInput[] = [];
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

export function toRowError(row: number, err: unknown): RowError {
  if (err instanceof z.ZodError) {
    const issue = err.issues[0];
    return {
      row,
      field: issue?.path.join(".") || "row",
      message: issue?.message ?? "validation failed",
    };
  }
  return {
    row,
    field: "row",
    message: err instanceof Error ? err.message : "unknown parse error",
  };
}
