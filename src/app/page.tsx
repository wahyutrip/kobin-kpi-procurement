import Link from "next/link";
import { KpiMatrixTable } from "@/components/kpi-matrix-table";
import { RecalcButton } from "@/components/recalc-button";
import {
  PerKpiChart,
  TotalScoreChart,
  type ChartPoint,
} from "@/components/kpi-charts";
import { monthLabel } from "@/components/format";
import { getKpiMatrix } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ year?: string }> };

export default async function DashboardPage({ searchParams }: Props) {
  const { year } = await searchParams;
  const { matrix, defs } = await getKpiMatrix();

  if (matrix.months.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
        <p className="text-slate-600">No data yet.</p>
        <Link
          href="/upload"
          className="mt-3 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Upload the monthly exports
        </Link>
      </div>
    );
  }

  const years = [...new Set(matrix.months.map((m) => m.period.slice(0, 4)))];
  const activeYear = year && years.includes(year) ? year : years[years.length - 1];
  const months = matrix.months.filter((m) => m.period.startsWith(activeYear));
  const ytd = matrix.ytd.filter((y) => y.period.startsWith(activeYear));

  const monthsWithData = months.filter((m) =>
    m.cells.some((c) => c.capai !== null),
  );
  const latest = monthsWithData[monthsWithData.length - 1];
  const ytdTotal = ytd[0]?.total ?? 0;

  const kpiKeys = defs.filter((d) => d.enabled).map((d) => `KPI ${d.kpiId}`);
  const chartData: ChartPoint[] = monthsWithData.map((m) => {
    const point: ChartPoint = { period: m.period, total: m.total };
    for (const c of m.cells) point[`KPI ${c.kpiId}`] = c.pct;
    return point;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            KPI Achievement {activeYear}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Divisi Procurement – Purchasing · standard / realisasi / achievement
            / weighted score per month
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RecalcButton />
          <div className="flex gap-1.5">
            {years.map((y) => (
              <Link
                key={y}
                href={`/?year=${y}`}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                  y === activeYear
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={latest ? `Latest month (${monthLabel(latest.period)})` : "Latest month"}
          value={latest ? latest.total.toFixed(1) : "–"}
          suffix="/ 100"
        />
        <StatCard label={`${activeYear} year-to-date`} value={ytdTotal.toFixed(1)} suffix="/ 100" />
        <StatCard
          label="Months with data"
          value={String(monthsWithData.length)}
          suffix={`/ ${months.length}`}
        />
      </div>

      <KpiMatrixTable defs={defs} periods={[...months, ...ytd]} />

      <p className="-mt-4 text-xs text-slate-500">
        Click a <span className="font-semibold text-indigo-700">REAL</span>{" "}
        value to see the underlying rows behind the number. KPI 5 &amp; 6 show
        “–” until their data source is connected.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <TotalScoreChart data={chartData} />
        <PerKpiChart data={chartData} kpiKeys={kpiKeys} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900">
        {value}
        {suffix && (
          <span className="ml-1 text-sm font-medium text-slate-400">
            {suffix}
          </span>
        )}
      </p>
    </div>
  );
}
