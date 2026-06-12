import { calculatePricePerformance } from "./kpi1-price-performance";
import { calculatePoToBpb } from "./kpi23-po-to-bpb";
import { calculatePrToPo } from "./kpi4-pr-to-po";
import { calculateManualKpi } from "./kpi56-manual";
import { calculateNewVendors } from "./kpi7-new-vendors";
import { listMonths, monthRange, ytdRange } from "./months";
import { scoreKpi } from "./scoring";
import { round } from "./scoring";
import type {
  DateRange,
  KpiCellResult,
  KpiDataset,
  KpiDefinition,
  KpiMatrix,
  KpiMeasure,
  PeriodResult,
} from "./types";

const DEFAULT_TOLERANCE = { kpi2: 7, kpi3: 14, kpi4: 7 } as const;

export type KpiContext = {
  /** ISO date used as "today" for outstanding-vs-overdue decisions. */
  today: string;
};

export function measureKpi(
  kpiId: number,
  dataset: KpiDataset,
  range: DateRange,
  def: KpiDefinition,
  ctx: KpiContext,
): KpiMeasure {
  switch (kpiId) {
    case 1:
      return calculatePricePerformance(dataset, range);
    case 2:
      return calculatePoToBpb(
        dataset,
        range,
        "Lokal",
        def.toleranceDays ?? DEFAULT_TOLERANCE.kpi2,
        ctx.today,
      );
    case 3:
      return calculatePoToBpb(
        dataset,
        range,
        "Impor",
        def.toleranceDays ?? DEFAULT_TOLERANCE.kpi3,
        ctx.today,
      );
    case 4:
      return calculatePrToPo(dataset, range, def.toleranceDays ?? DEFAULT_TOLERANCE.kpi4);
    case 5:
    case 6:
      return calculateManualKpi(dataset, range, kpiId);
    case 7:
      return calculateNewVendors(dataset, range);
    default:
      throw new Error(`Unknown KPI id ${kpiId}`);
  }
}

function computePeriod(
  period: string,
  monthlyRange: DateRange,
  cumulativeRange: DateRange,
  dataset: KpiDataset,
  defs: readonly KpiDefinition[],
  ctx: KpiContext,
): PeriodResult {
  const enabledDefs = defs.filter((d) => d.enabled);
  let cells: KpiCellResult[] = enabledDefs.map((def) => {
    const range =
      def.aggregation === "yearly_cumulative" ? cumulativeRange : monthlyRange;
    return scoreKpi(def, measureKpi(def.kpiId, dataset, range, def, ctx));
  });

  // A padded month with no monthly activity should read as fully blank —
  // otherwise yearly-cumulative KPIs (e.g. vendor count) "fill" future months.
  const isMonthly = !period.endsWith("YTD");
  const hasMonthlyData = cells.some((c, i) => {
    return enabledDefs[i].aggregation === "monthly" && c.real !== null;
  });
  if (isMonthly && !hasMonthlyData) {
    cells = cells.map((c) => ({
      ...c,
      real: null,
      pct: null,
      capai: null,
      sampleSize: 0,
    }));
  }

  const total = round(
    cells.reduce((sum, c) => sum + (c.capai ?? 0), 0),
    2,
  );
  return { period, range: monthlyRange, cells, total };
}

/**
 * Months shown in the matrix: every calendar year touched by the data is
 * padded to a full Jan–Dec, so months without data still appear as columns.
 */
export function datasetMonths(dataset: KpiDataset): string[] {
  const dates: string[] = [
    ...dataset.poRows.map((r) => r.poDate),
    ...dataset.prGrRows.map((r) => r.prDate),
    ...dataset.prGrRows.flatMap((r) => (r.grpoDate ? [r.grpoDate] : [])),
  ];
  if (dates.length === 0) return [];
  let min = dates[0];
  let max = dates[0];
  for (const d of dates) {
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return listMonths(`${min.slice(0, 4)}-01-01`, `${max.slice(0, 4)}-12-31`);
}

/**
 * Compute the full KPI matrix: one PeriodResult per data month, plus one YTD
 * result per calendar year (Jan 1 → end of that year's latest data month).
 */
export function computeKpiMatrix(
  dataset: KpiDataset,
  defs: readonly KpiDefinition[],
  ctx?: Partial<KpiContext>,
): KpiMatrix {
  const today = ctx?.today ?? new Date().toISOString().slice(0, 10);
  const fullCtx: KpiContext = { today };

  const months = datasetMonths(dataset);
  const monthResults = months.map((month) =>
    computePeriod(
      month,
      monthRange(month),
      ytdRange(month),
      dataset,
      defs,
      fullCtx,
    ),
  );

  const lastMonthOfYear = new Map<string, string>();
  for (const month of months) {
    lastMonthOfYear.set(month.slice(0, 4), month);
  }
  const ytdResults = [...lastMonthOfYear.entries()].map(([year, month]) => {
    const range = ytdRange(month);
    return computePeriod(`${year}-YTD`, range, range, dataset, defs, fullCtx);
  });

  return { months: monthResults, ytd: ytdResults };
}
