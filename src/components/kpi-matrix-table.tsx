import Link from "next/link";
import type { KpiDefinition, PeriodResult } from "@/lib/kpi/types";
import {
  formatCapai,
  formatPct,
  formatReal,
  monthLabel,
  pctBadge,
} from "./format";

type Props = {
  defs: KpiDefinition[];
  periods: PeriodResult[];
};

const SUB_COLUMNS = ["STD", "REAL", "%", "CAPAI"] as const;

export function KpiMatrixTable({ defs, periods }: Props) {
  const enabled = defs.filter((d) => d.enabled);
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full border-collapse text-[13px] leading-tight text-slate-900">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 min-w-56 border-b-2 border-slate-200 bg-white px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Key Performance Indicator
            </th>
            <th className="border-b-2 border-slate-200 bg-white px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Bobot
            </th>
            {periods.map((p) => (
              <th
                key={p.period}
                colSpan={4}
                className={`border-b-2 border-l border-slate-200 px-2 py-3 text-center text-[11px] font-bold uppercase tracking-wider ${
                  p.period.endsWith("YTD")
                    ? "bg-indigo-50 text-indigo-900"
                    : "bg-white text-slate-700"
                }`}
              >
                {monthLabel(p.period)}
              </th>
            ))}
          </tr>
          <tr>
            <th className="sticky left-0 z-20 border-b border-slate-200 bg-white" />
            <th className="border-b border-slate-200 bg-white" />
            {periods.map((p) =>
              SUB_COLUMNS.map((c, i) => (
                <th
                  key={`${p.period}-${c}`}
                  className={`border-b border-slate-200 px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400 ${
                    i === 0 ? "border-l" : ""
                  } ${p.period.endsWith("YTD") ? "bg-indigo-50/60" : "bg-white"}`}
                >
                  {c}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {enabled.map((def) => (
            <tr key={def.kpiId} className="group">
              <td className="sticky left-0 z-10 max-w-72 border-b border-slate-100 bg-white px-4 py-2.5 font-medium text-slate-900 group-hover:bg-slate-50">
                <Link
                  href={`/methodology/${def.kpiId}`}
                  title="How is this KPI calculated?"
                  className="hover:text-indigo-700"
                >
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-[10px] font-bold text-white">
                    {def.kpiId}
                  </span>
                  {def.name}
                  <span className="ml-1.5 align-middle text-[10px] text-slate-400">
                    ⓘ
                  </span>
                </Link>
              </td>
              <td className="border-b border-slate-100 px-2 py-2.5 text-center font-semibold text-slate-700">
                {(def.weight * 100).toFixed(0)}%
              </td>
              {periods.map((p) => {
                const cell = p.cells.find((c) => c.kpiId === def.kpiId);
                const isYtd = p.period.endsWith("YTD");
                return (
                  <CellGroup
                    key={`${p.period}-${def.kpiId}`}
                    stdLabel={def.stdLabel}
                    kpiId={def.kpiId}
                    real={cell?.real ?? null}
                    pct={cell?.pct ?? null}
                    capai={cell?.capai ?? null}
                    href={isYtd ? null : `/kpi/${def.kpiId}?month=${p.period}`}
                    highlight={isYtd}
                  />
                );
              })}
            </tr>
          ))}
          <tr className="border-t-2 border-slate-300">
            <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-bold text-slate-900">
              TOTAL CAPAI KPI
            </td>
            <td className="px-2 py-3 text-center text-sm font-bold text-slate-900">
              100%
            </td>
            {periods.map((p) => {
              const hasData = p.cells.some((c) => c.capai !== null);
              return (
                <td
                  key={p.period}
                  colSpan={4}
                  className={`border-l border-slate-200 px-2 py-3 text-center text-sm font-bold ${
                    p.period.endsWith("YTD")
                      ? "bg-indigo-50 text-indigo-900"
                      : "text-slate-900"
                  }`}
                >
                  {hasData ? p.total.toFixed(1) : "–"}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CellGroup({
  stdLabel,
  kpiId,
  real,
  pct,
  capai,
  href,
  highlight,
}: {
  stdLabel: string;
  kpiId: number;
  real: number | null;
  pct: number | null;
  capai: number | null;
  href: string | null;
  highlight: boolean;
}) {
  const bg = highlight ? "bg-indigo-50/60" : "group-hover:bg-slate-50";
  const realText = formatReal(kpiId, real);
  return (
    <>
      <td
        className={`whitespace-nowrap border-b border-l border-slate-100 px-2 py-2.5 text-center text-[11px] text-slate-500 ${bg}`}
      >
        {stdLabel}
      </td>
      <td className={`whitespace-nowrap border-b border-slate-100 px-2 py-2.5 text-center font-semibold text-slate-900 ${bg}`}>
        {href && real !== null ? (
          <Link
            href={href}
            className="text-indigo-700 decoration-indigo-300 underline-offset-2 hover:underline"
          >
            {realText}
          </Link>
        ) : (
          <span className={real === null ? "text-slate-300" : undefined}>{realText}</span>
        )}
      </td>
      <td className={`border-b border-slate-100 px-1.5 py-2 text-center ${bg}`}>
        <span
          className={`inline-block min-w-11 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${pctBadge(pct)}`}
        >
          {formatPct(pct)}
        </span>
      </td>
      <td className={`border-b border-slate-100 px-2 py-2.5 text-center font-bold text-slate-900 ${bg}`}>
        <span className={capai === null ? "text-slate-300" : undefined}>
          {formatCapai(capai)}
        </span>
      </td>
    </>
  );
}
