export type ScoringMethod = "ratio" | "threshold_max";

export type KpiDefinition = {
  kpiId: number;
  name: string;
  weight: number; // fraction, e.g. 0.2
  stdValue: number;
  stdLabel: string;
  scoring: ScoringMethod;
  toleranceDays: number | null;
  aggregation: "monthly" | "yearly_cumulative";
  enabled: boolean;
};

/** Minimal PO line fields the calculators need. */
export type PoRow = {
  poNo: string;
  poDate: string; // ISO
  lokalImpor: string;
  eta: string | null;
  currency: string | null;
  itemNamePo: string;
  unitPrice: number | null;
  vendorCode: string | null;
};

/** Minimal PR→GR line fields the calculators need. */
export type PrGrRow = {
  prNo: string;
  prDate: string;
  itemCode: string;
  itemName: string | null;
  poNo: string | null;
  prToPoDays: number | null;
  grpoNo: string | null;
  grpoDate: string | null;
};

export type VendorRow = { vendorCode: string; firstPoDate: string };

export type ManualEntry = { month: string; kpiId: number; value: number };

export type KpiDataset = {
  poRows: PoRow[];
  prGrRows: PrGrRow[];
  vendors: VendorRow[];
  manualEntries: ManualEntry[];
};

/** Inclusive ISO date range used for both single months and YTD windows. */
export type DateRange = { from: string; to: string };

export type KpiMeasure = {
  /** null = no data for this KPI in this period */
  real: number | null;
  sampleSize: number;
};

export type KpiCellResult = {
  kpiId: number;
  real: number | null;
  std: number;
  /** achievement 0–100, null when real is null */
  pct: number | null;
  /** weighted points contributed (0..weight×100), null when real is null */
  capai: number | null;
  sampleSize: number;
};

export type PeriodResult = {
  /** "YYYY-MM" for months, "YYYY-YTD" for year-to-date */
  period: string;
  range: DateRange;
  cells: KpiCellResult[];
  /** Σ capai over KPIs with data */
  total: number;
};

export type KpiMatrix = {
  months: PeriodResult[];
  ytd: PeriodResult[];
};
