import Link from "next/link";
import {
  getMergedData,
  REALISASI_VALUES,
  SORTABLE_COLUMNS,
  type MergedFilters,
  type MergedRow,
  type Realisasi,
} from "@/lib/server/merged-data";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const FILTER_FORM = "data-filters";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const REALISASI_BADGES: Record<Realisasi, [string, string]> = {
  on_time: ["On time", "bg-emerald-100 text-emerald-900"],
  late: ["Late", "bg-rose-100 text-rose-900"],
  overdue: ["Overdue", "bg-rose-100 text-rose-900"],
  outstanding: ["Outstanding", "bg-sky-100 text-sky-900"],
  no_eta: ["No ETA", "bg-slate-100 text-slate-500"],
};

const CURRENCIES = ["IDR", "USD", "EUR", "RMB"];

type Search = Partial<Record<string, string>>;

function cleanText(v: string | undefined): string {
  return (v ?? "").trim().slice(0, 100);
}

function cleanDate(v: string | undefined): string {
  const t = (v ?? "").trim();
  return ISO_DATE.test(t) ? t : "";
}

export default async function DataPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const filters: MergedFilters = {
    q: cleanText(sp.q),
    prNo: cleanText(sp.prNo),
    poNo: cleanText(sp.poNo),
    vendor: cleanText(sp.vendor),
    item: cleanText(sp.item),
    scope: sp.scope === "Lokal" || sp.scope === "Impor" ? sp.scope : "all",
    currency: CURRENCIES.includes(sp.currency ?? "") ? sp.currency! : "",
    realisasi: REALISASI_VALUES.includes(sp.realisasi as Realisasi)
      ? (sp.realisasi as Realisasi)
      : "all",
    prDateFrom: cleanDate(sp.prDateFrom),
    prDateTo: cleanDate(sp.prDateTo),
    poDateFrom: cleanDate(sp.poDateFrom),
    poDateTo: cleanDate(sp.poDateTo),
    etaFrom: cleanDate(sp.etaFrom),
    etaTo: cleanDate(sp.etaTo),
    grpoFrom: cleanDate(sp.grpoFrom),
    grpoTo: cleanDate(sp.grpoTo),
  };
  const sort = sp.sort && sp.sort in SORTABLE_COLUMNS ? sp.sort : "poDate";
  const dir = sp.dir === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(sp.page) || 1);

  const { rows, totalRows } = await getMergedData({
    ...filters,
    sort,
    dir,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== "" && v !== "all",
  ).length;

  const url = (over: Search) => {
    const params = new URLSearchParams();
    const all: Search = { ...filters, sort, dir, page: String(page), ...over };
    for (const [k, v] of Object.entries(all)) {
      if (v && v !== "all") params.set(k, v);
    }
    return `/data?${params.toString()}`;
  };

  const sortLink = (key: string) =>
    url({ sort: key, dir: sort === key && dir === "desc" ? "asc" : "desc", page: "1" });
  const sortMark = (key: string) =>
    sort === key ? (dir === "asc" ? " ▲" : " ▼") : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Merged data
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            PO lines joined with goods receipts (latest GRPO per PO) and the
            realisasi status used by KPI 2/3 · {totalRows.toLocaleString()}{" "}
            row(s)
            {activeFilterCount > 0 && ` · ${activeFilterCount} filter(s) active`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeFilterCount > 0 && (
            <Link
              href="/data"
              className="text-sm font-medium text-slate-500 hover:underline"
            >
              Clear all filters
            </Link>
          )}
          <button
            type="submit"
            form={FILTER_FORM}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Apply filters
          </button>
        </div>
      </div>

      {/* The filter inputs in the table header belong to this form */}
      <form id={FILTER_FORM} action="/data">
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Quick search across PO No, PR No, vendor, item… (press Enter)"
          className="w-full max-w-xl rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
        />
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-[12px] leading-tight text-slate-900">
          <thead>
            <tr>
              <Th label={`PR No${sortMark("prNo")}`} href={sortLink("prNo")} />
              <Th label={`PR Date${sortMark("prDate")}`} href={sortLink("prDate")} />
              <Th label={`PO No${sortMark("poNo")}`} href={sortLink("poNo")} />
              <Th label={`PO Date${sortMark("poDate")}`} href={sortLink("poDate")} />
              <Th label="L/I" />
              <Th label={`Vendor${sortMark("vendorName")}`} href={sortLink("vendorName")} />
              <Th label={`Item${sortMark("itemNamePo")}`} href={sortLink("itemNamePo")} />
              <Th label="Qty" />
              <Th label={`Unit Price${sortMark("unitPrice")}`} href={sortLink("unitPrice")} />
              <Th label="Cur" />
              <Th label={`ETA${sortMark("eta")}`} href={sortLink("eta")} />
              <Th label="Deadline" />
              <Th label="GRPO Date" />
              <Th label="Realisasi" />
            </tr>
            <tr className="bg-slate-50">
              <Fc>
                <TextFilter name="prNo" value={filters.prNo} />
              </Fc>
              <Fc>
                <DateRangeFilter from={["prDateFrom", filters.prDateFrom]} to={["prDateTo", filters.prDateTo]} />
              </Fc>
              <Fc>
                <TextFilter name="poNo" value={filters.poNo} />
              </Fc>
              <Fc>
                <DateRangeFilter from={["poDateFrom", filters.poDateFrom]} to={["poDateTo", filters.poDateTo]} />
              </Fc>
              <Fc>
                <SelectFilter
                  name="scope"
                  value={filters.scope}
                  options={[["all", "All"], ["Lokal", "Lokal"], ["Impor", "Impor"]]}
                />
              </Fc>
              <Fc>
                <TextFilter name="vendor" value={filters.vendor} />
              </Fc>
              <Fc>
                <TextFilter name="item" value={filters.item} />
              </Fc>
              <Fc />
              <Fc />
              <Fc>
                <SelectFilter
                  name="currency"
                  value={filters.currency || "all"}
                  options={[["all", "All"], ...CURRENCIES.map((c): [string, string] => [c, c])]}
                />
              </Fc>
              <Fc>
                <DateRangeFilter from={["etaFrom", filters.etaFrom]} to={["etaTo", filters.etaTo]} />
              </Fc>
              <Fc />
              <Fc>
                <DateRangeFilter from={["grpoFrom", filters.grpoFrom]} to={["grpoTo", filters.grpoTo]} />
              </Fc>
              <Fc>
                <SelectFilter
                  name="realisasi"
                  value={filters.realisasi}
                  options={[
                    ["all", "All"],
                    ...REALISASI_VALUES.map((v): [string, string] => [
                      v,
                      REALISASI_BADGES[v][0],
                    ]),
                  ]}
                />
              </Fc>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={14}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  No rows match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => <DataRow key={`${r.poNo}-${r.prNo}-${i}`} r={r} />)
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 text-sm text-slate-600">
        <PageLink href={url({ page: String(page - 1) })} disabled={page <= 1} label="← Prev" />
        <span>
          Page {page.toLocaleString()} of {totalPages.toLocaleString()}
        </span>
        <PageLink
          href={url({ page: String(page + 1) })}
          disabled={page >= totalPages}
          label="Next →"
        />
        <span className="ml-auto text-xs text-slate-400">
          {PAGE_SIZE} rows per page · filters apply on Enter or “Apply filters”
        </span>
      </div>
    </div>
  );
}

function Th({ label, href }: { label: string; href?: string }) {
  return (
    <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
      {href ? (
        <Link href={href} className="hover:text-slate-900">
          {label}
        </Link>
      ) : (
        label
      )}
    </th>
  );
}

/** Filter cell */
function Fc({ children }: { children?: React.ReactNode }) {
  return (
    <td className="border-b-2 border-slate-200 px-1.5 py-1.5 align-top">
      {children}
    </td>
  );
}

function TextFilter({ name, value }: { name: string; value: string }) {
  return (
    <input
      form={FILTER_FORM}
      type="search"
      name={name}
      defaultValue={value}
      placeholder="contains…"
      className="w-full min-w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
    />
  );
}

function DateRangeFilter({
  from,
  to,
}: {
  from: [string, string];
  to: [string, string];
}) {
  return (
    <div className="flex min-w-32 flex-col gap-1">
      <input
        form={FILTER_FORM}
        type="date"
        name={from[0]}
        defaultValue={from[1]}
        title="From"
        className="w-full rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-900 focus:border-slate-500 focus:outline-none"
      />
      <input
        form={FILTER_FORM}
        type="date"
        name={to[0]}
        defaultValue={to[1]}
        title="To"
        className="w-full rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-900 focus:border-slate-500 focus:outline-none"
      />
    </div>
  );
}

function SelectFilter({
  name,
  value,
  options,
}: {
  name: string;
  value: string;
  options: Array<[string, string]>;
}) {
  return (
    <select
      form={FILTER_FORM}
      name={name}
      defaultValue={value}
      className="w-full min-w-20 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-[11px] text-slate-900"
    >
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

function DataRow({ r }: { r: MergedRow }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="whitespace-nowrap px-3 py-2">{r.prNo}</td>
      <td className="whitespace-nowrap px-3 py-2">{r.prDate ?? "–"}</td>
      <td className="whitespace-nowrap px-3 py-2 font-medium">{r.poNo}</td>
      <td className="whitespace-nowrap px-3 py-2">{r.poDate}</td>
      <td className="px-3 py-2">{r.lokalImpor}</td>
      <td className="max-w-48 truncate px-3 py-2" title={r.vendorName ?? undefined}>
        {r.vendorName ?? "–"}
      </td>
      <td className="max-w-64 truncate px-3 py-2" title={r.itemNamePo}>
        {r.itemNamePo}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right">
        {r.qtyPo ? Number(r.qtyPo).toLocaleString() : "–"}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right">
        {r.unitPrice ? Number(r.unitPrice).toLocaleString() : "–"}
      </td>
      <td className="px-3 py-2">{r.currency ?? "–"}</td>
      <td className="whitespace-nowrap px-3 py-2">{r.eta ?? "–"}</td>
      <td className="whitespace-nowrap px-3 py-2">{r.deadline ?? "–"}</td>
      <td className="whitespace-nowrap px-3 py-2">{r.grpoDate ?? "–"}</td>
      <td className="whitespace-nowrap px-3 py-2">
        <RealisasiBadge value={r.realisasi} />
      </td>
    </tr>
  );
}

function RealisasiBadge({ value }: { value: Realisasi }) {
  const [label, classes] = REALISASI_BADGES[value];
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${classes}`}>
      {label}
    </span>
  );
}

function PageLink({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-300">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-100"
    >
      {label}
    </Link>
  );
}
