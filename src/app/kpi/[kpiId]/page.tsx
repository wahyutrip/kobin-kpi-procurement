import Link from "next/link";
import { notFound } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { monthLabel } from "@/components/format";
import { getKpiDrilldown } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ kpiId: string }>;
  searchParams: Promise<{ month?: string }>;
};

export default async function KpiDrilldownPage({ params, searchParams }: Props) {
  const { kpiId: kpiIdRaw } = await params;
  const { month } = await searchParams;
  const kpiId = Number(kpiIdRaw);
  if (!Number.isInteger(kpiId) || kpiId < 1 || kpiId > 7) notFound();
  if (!month || !/^\d{4}-\d{2}$/.test(month)) notFound();

  const { def, rows } = await getKpiDrilldown(kpiId, month);

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/?year=${month.slice(0, 4)}`} className="text-sm text-indigo-700 hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-1 text-lg font-bold">
          KPI {def.kpiId} — {def.name}
        </h1>
        <p className="text-sm text-slate-600">
          {monthLabel(month)}
          {def.aggregation === "yearly_cumulative" &&
            ` (cumulative since January ${month.slice(0, 4)})`}{" "}
          · standard: {def.stdLabel} · weight {(def.weight * 100).toFixed(0)}% ·{" "}
          {rows.length.toLocaleString()} underlying row(s)
        </p>
      </div>
      <DataTable rows={rows} fileName={`kpi${kpiId}-${month}`} />
    </div>
  );
}
