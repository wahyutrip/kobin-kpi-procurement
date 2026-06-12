"use client";

import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import type { DrilldownRow } from "@/lib/server/queries";

const HEADER_LABELS: Record<string, string> = {
  poNo: "PO No",
  poDate: "PO Date",
  prNo: "PR No",
  prDate: "PR Date",
  itemCode: "Item Code",
  itemNamePo: "Item",
  currency: "Currency",
  prevPrice: "Prev Price",
  price: "Price",
  deltaPct: "Δ %",
  eta: "ETA",
  grpoDate: "GRPO Date",
  deadline: "Deadline (ETA+tol)",
  onTime: "On Time",
  prToPoDays: "PR→PO Days",
  vendorCode: "Vendor Code",
  firstPoDate: "First PO Date",
  month: "Month",
  value: "Value",
  status: "Status",
};

const STATUS_LABELS: Record<string, string> = {
  on_time: "On time",
  late: "Late",
  overdue_not_received: "Overdue — not received",
};

function formatCell(key: string, value: unknown): string {
  if (value === null || value === undefined) return "–";
  if (typeof value === "boolean") return value ? "✓ Yes" : "✗ No";
  if (typeof value === "number") {
    return key === "deltaPct" ? `${value.toFixed(2)}%` : value.toLocaleString();
  }
  if (key === "status") return STATUS_LABELS[String(value)] ?? String(value);
  return String(value);
}

export function DrilldownTable({
  rows,
  fileName,
}: {
  rows: DrilldownRow[];
  fileName: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo(() => {
    const keys = rows.length > 0 ? Object.keys(rows[0]) : [];
    const helper = createColumnHelper<DrilldownRow>();
    return keys.map((key) =>
      helper.accessor((row) => row[key], {
        id: key,
        header: HEADER_LABELS[key] ?? key,
        cell: (info) => formatCell(key, info.getValue()),
      }),
    );
  }, [rows]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  function exportCsv() {
    const keys = rows.length > 0 ? Object.keys(rows[0]) : [];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      keys.join(","),
      ...table
        .getFilteredRowModel()
        .rows.map((r) => keys.map((k) => esc(r.original[k])).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        No underlying rows for this KPI in this period.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Filter rows…"
          className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button
          onClick={exportCsv}
          className="rounded-md bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-100">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    onClick={h.column.getToggleSortingHandler()}
                    className="cursor-pointer select-none border-b border-slate-200 px-3 py-2 text-left font-semibold"
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {{ asc: " ▲", desc: " ▼" }[
                      h.column.getIsSorted() as string
                    ] ?? ""}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="even:bg-slate-50/50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="border-b border-slate-100 px-3 py-1.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
        >
          Prev
        </button>
        <span>
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount().toLocaleString()}
        </span>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
        >
          Next
        </button>
        <span className="ml-auto">
          {table.getFilteredRowModel().rows.length.toLocaleString()} row(s)
        </span>
      </div>
    </div>
  );
}
