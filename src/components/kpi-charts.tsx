"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { monthLabel } from "./format";

export type ChartPoint = {
  period: string;
  total: number;
  [kpiKey: string]: string | number | null;
};

const KPI_COLORS: Record<string, string> = {
  "KPI 1": "#6366f1",
  "KPI 2": "#059669",
  "KPI 3": "#0ea5e9",
  "KPI 4": "#f59e0b",
  "KPI 5": "#a855f7",
  "KPI 6": "#64748b",
  "KPI 7": "#e11d48",
};

export function TotalScoreChart({ data }: { data: ChartPoint[] }) {
  return (
    <ChartCard title="Total weighted score per month (target 100)">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="period" tickFormatter={monthLabel} fontSize={11} />
          <YAxis domain={[0, 100]} fontSize={11} />
          <Tooltip labelFormatter={(v) => monthLabel(String(v))} />
          <ReferenceLine y={100} stroke="#94a3b8" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="total"
            name="Total CAPAI"
            stroke="#4f46e5"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function PerKpiChart({
  data,
  kpiKeys,
}: {
  data: ChartPoint[];
  kpiKeys: string[];
}) {
  return (
    <ChartCard title="Achievement % per KPI">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="period" tickFormatter={monthLabel} fontSize={11} />
          <YAxis domain={[0, 100]} fontSize={11} />
          <Tooltip labelFormatter={(v) => monthLabel(String(v))} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {kpiKeys.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={KPI_COLORS[key] ?? "#334155"}
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}
