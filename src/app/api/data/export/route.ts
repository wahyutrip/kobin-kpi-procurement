import { NextResponse, type NextRequest } from "next/server";
import {
  getMergedData,
  parseMergedParams,
  type MergedRow,
} from "@/lib/server/merged-data";

const EXPORT_CAP = 100_000;

const COLUMNS: Array<keyof MergedRow> = [
  "prNo",
  "prDate",
  "poNo",
  "poDate",
  "lokalImpor",
  "vendorName",
  "itemNamePo",
  "qtyPo",
  "unitPrice",
  "currency",
  "poStatus",
  "eta",
  "deadline",
  "grpoDate",
  "realisasi",
];

function esc(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  try {
    const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
    const { filters, sort, dir } = parseMergedParams(sp);
    const { rows, totalRows } = await getMergedData({
      ...filters,
      sort,
      dir,
      page: 1,
      pageSize: EXPORT_CAP,
    });

    const lines = [
      COLUMNS.join(","),
      ...rows.map((r) => COLUMNS.map((c) => esc(r[c])).join(",")),
    ];
    if (totalRows > EXPORT_CAP) {
      lines.push(`# truncated: ${totalRows - EXPORT_CAP} more row(s) beyond the ${EXPORT_CAP} export cap`);
    }
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="merged-data-${stamp}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "export failed" }, { status: 500 });
  }
}
