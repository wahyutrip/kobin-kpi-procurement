"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";

export type DataTableRow = Record<string, string | number | boolean | null>;

export type DataTableColumn = {
  key: string;
  label: string;
  /** 'badge' renders a colored pill, 'link' treats the value as an href */
  kind?: "text" | "number" | "badge" | "link";
  /** label shown for link kind */
  linkLabel?: string;
};

const BADGE_STYLES: Record<string, string> = {
  // upload statuses
  success: "bg-emerald-100 text-emerald-900",
  partial: "bg-amber-100 text-amber-900",
  failed: "bg-rose-100 text-rose-900",
  processing: "bg-slate-100 text-slate-600",
  // realisasi / generic
  "On time": "bg-emerald-100 text-emerald-900",
  Late: "bg-rose-100 text-rose-900",
  Overdue: "bg-rose-100 text-rose-900",
  Outstanding: "bg-sky-100 text-sky-900",
};

const DEFAULT_LABELS: Record<string, string> = {
  poNo: "PO No",
  poDate: "PO Date",
  prNo: "PR No",
  prDate: "PR Date",
  itemCode: "Item Code",
  itemNamePo: "Item",
  currency: "Currency",
  prevPoNo: "Prev PO No",
  prevPoDate: "Prev PO Date",
  prevPrice: "Prev Price",
  price: "Price",
  deltaPct: "Δ %",
  eta: "ETA",
  grpoDate: "GRPO Date",
  deadline: "Deadline (ETA+tol)",
  onTime: "On Time",
  status: "Status",
  prToPoDays: "PR→PO Days",
  vendorCode: "Vendor Code",
  firstPoDate: "First PO Date",
  month: "Month",
  value: "Value",
};

const STATUS_LABELS: Record<string, string> = {
  on_time: "On time",
  late: "Late",
  overdue_not_received: "Overdue — not received",
};

const PAGE_SIZES = [10, 20, 50, 100, 500, 1000];

function formatCell(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  if (typeof value === "boolean") return value ? "✓ Yes" : "✗ No";
  if (typeof value === "number") {
    return key === "deltaPct" ? `${value.toFixed(2)}%` : value.toLocaleString();
  }
  if (key === "status") return STATUS_LABELS[String(value)] ?? String(value);
  return String(value);
}

export function DataTable({
  rows,
  columns,
  fileName,
  defaultPageSize = 50,
}: {
  rows: DataTableRow[];
  /** omit to derive columns from the first row's keys */
  columns?: DataTableColumn[];
  fileName: string;
  defaultPageSize?: number;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const columnDefs = useMemo(() => {
    const specs: DataTableColumn[] =
      columns ??
      (rows.length > 0
        ? Object.keys(rows[0]).map((key) => ({
            key,
            label: DEFAULT_LABELS[key] ?? key,
          }))
        : []);
    const helper = createColumnHelper<DataTableRow>();
    return specs.map((spec) =>
      helper.accessor((row) => row[spec.key], {
        id: spec.key,
        header: spec.label,
        filterFn: "includesString",
        cell: (info) => {
          const value = info.getValue();
          if (spec.kind === "link" && typeof value === "string" && value) {
            return (
              <Link
                href={value}
                className="font-semibold text-indigo-700 hover:underline"
              >
                {spec.linkLabel ?? "View"}
              </Link>
            );
          }
          if (spec.kind === "badge" && value !== null && value !== undefined) {
            const text = formatCell(spec.key, value);
            return (
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  BADGE_STYLES[String(value)] ??
                  BADGE_STYLES[text] ??
                  "bg-slate-100 text-slate-700"
                }`}
              >
                {text}
              </span>
            );
          }
          return formatCell(spec.key, value);
        },
      }),
    );
  }, [rows, columns]);

  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: defaultPageSize } },
  });

  function exportCsv() {
    const keys = columnDefs.map((c) => c.id ?? "");
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
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        No rows to display.
      </div>
    );
  }

  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search all columns…"
          className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
        />
        <div className="flex items-center gap-3">
          {(globalFilter || columnFilters.length > 0) && (
            <button
              onClick={() => {
                setGlobalFilter("");
                setColumnFilters([]);
              }}
              className="text-sm font-medium text-slate-500 hover:underline"
            >
              Clear all filters
            </button>
          )}
          <button
            onClick={exportCsv}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Export CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-[12px] leading-tight text-slate-900">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    onClick={h.column.getToggleSortingHandler()}
                    className="cursor-pointer select-none whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900"
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {{ asc: " ▲", desc: " ▼" }[
                      h.column.getIsSorted() as string
                    ] ?? ""}
                  </th>
                ))}
              </tr>
            ))}
            <tr className="bg-slate-50">
              {table.getHeaderGroups()[0]?.headers.map((h) => {
                const value = (h.column.getFilterValue() as string) ?? "";
                return (
                  <td
                    key={`filter-${h.id}`}
                    className="border-b-2 border-slate-200 px-1.5 py-1.5 align-top"
                  >
                    <input
                      value={value}
                      onChange={(e) =>
                        h.column.setFilterValue(e.target.value || undefined)
                      }
                      placeholder="filter…"
                      className="w-full min-w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
                    />
                    {value && (
                      <button
                        onClick={() => h.column.setFilterValue(undefined)}
                        className="mt-1 block w-full text-center text-[10px] font-semibold text-rose-600 hover:underline"
                      >
                        ✕ clear
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-100 even:bg-slate-50/40 hover:bg-slate-50"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="whitespace-nowrap px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40"
        >
          ← Prev
        </button>
        <span>
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount().toLocaleString()}
        </span>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40"
        >
          Next →
        </button>
        <span className="text-xs text-slate-400">
          {filteredCount.toLocaleString()} row(s)
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
          Rows per page:
          {PAGE_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => table.setPageSize(size)}
              className={`rounded-md px-2 py-0.5 ${
                table.getState().pagination.pageSize === size
                  ? "bg-slate-900 font-semibold text-white"
                  : "text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              {size}
            </button>
          ))}
        </span>
      </div>
    </div>
  );
}
