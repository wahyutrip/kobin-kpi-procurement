import type { ScoringMethod } from "./types";
export type KpiAggregation = "monthly" | "yearly_cumulative";

export type KpiConfigSeed = {
  kpiId: number;
  name: string;
  weight: number;
  stdValue: number;
  stdLabel: string;
  scoring: ScoringMethod;
  toleranceDays: number | null;
  aggregation: KpiAggregation;
  enabled: boolean;
};

export const KPI_CONFIG_DEFAULTS: readonly KpiConfigSeed[] = [
  {
    kpiId: 1,
    name: "Price performance (harga PO terhadap last PO)",
    weight: 0.1,
    stdValue: -1,
    stdLabel: "Min – 1%",
    scoring: "ratio",
    toleranceDays: null,
    aggregation: "monthly",
    enabled: true,
  },
  {
    kpiId: 2,
    name: "Realisasi PO to BPB (Local)",
    weight: 0.2,
    stdValue: 95,
    stdLabel: "95%",
    scoring: "ratio",
    toleranceDays: 7,
    aggregation: "monthly",
    enabled: true,
  },
  {
    kpiId: 3,
    name: "Realisasi PO to BPB (Import)",
    weight: 0.2,
    stdValue: 95,
    stdLabel: "95%",
    scoring: "ratio",
    toleranceDays: 14,
    aggregation: "monthly",
    enabled: true,
  },
  {
    kpiId: 4,
    name: "Realisasi PR to PO",
    weight: 0.15,
    stdValue: 95,
    stdLabel: "95%",
    scoring: "ratio",
    toleranceDays: 7,
    aggregation: "monthly",
    enabled: true,
  },
  {
    kpiId: 5,
    name: "Quality Compliance",
    weight: 0.15,
    stdValue: 3,
    stdLabel: "LKM max. 3",
    scoring: "threshold_max",
    toleranceDays: null,
    aggregation: "monthly",
    enabled: true,
  },
  {
    kpiId: 6,
    name: "Subtitusi material for backup",
    weight: 0.1,
    stdValue: 1,
    stdLabel: "Max 1 items / year",
    scoring: "threshold_max",
    toleranceDays: null,
    aggregation: "yearly_cumulative",
    enabled: true,
  },
  {
    kpiId: 7,
    name: "Sourcing New Vendor",
    weight: 0.1,
    stdValue: 6,
    stdLabel: "Min 6 vendor / year",
    scoring: "ratio",
    toleranceDays: null,
    aggregation: "yearly_cumulative",
    enabled: true,
  },
] as const;
