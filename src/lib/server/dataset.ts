import { getDb } from "@/lib/db/client";
import {
  kpiConfig,
  kpiManualEntries,
  poLines,
  prGrLines,
  vendors,
} from "@/lib/db/schema";
import type {
  KpiDataset,
  KpiDefinition,
  ScoringMethod,
} from "@/lib/kpi/types";

const num = (s: string | null): number | null => (s === null ? null : Number(s));

/** Load the minimal row sets the KPI calculators need, in one pass. */
export async function loadKpiDataset(): Promise<KpiDataset> {
  const db = getDb();
  const [poRows, grRows, vendorRows, manualRows] = await Promise.all([
    db
      .select({
        poNo: poLines.poNo,
        poDate: poLines.poDate,
        lokalImpor: poLines.lokalImpor,
        eta: poLines.eta,
        currency: poLines.currency,
        itemNamePo: poLines.itemNamePo,
        unitPrice: poLines.unitPrice,
        vendorCode: poLines.vendorCode,
      })
      .from(poLines),
    db
      .select({
        prNo: prGrLines.prNo,
        prDate: prGrLines.prDate,
        itemCode: prGrLines.itemCode,
        itemName: prGrLines.itemName,
        poNo: prGrLines.poNo,
        prToPoDays: prGrLines.prToPoDays,
        grpoNo: prGrLines.grpoNo,
        grpoDate: prGrLines.grpoDate,
      })
      .from(prGrLines),
    db
      .select({
        vendorCode: vendors.vendorCode,
        firstPoDate: vendors.firstPoDate,
      })
      .from(vendors),
    db
      .select({
        month: kpiManualEntries.month,
        kpiId: kpiManualEntries.kpiId,
        value: kpiManualEntries.value,
      })
      .from(kpiManualEntries),
  ]);

  return {
    poRows: poRows.map((r) => ({ ...r, unitPrice: num(r.unitPrice) })),
    prGrRows: grRows,
    vendors: vendorRows,
    manualEntries: manualRows.map((r) => ({ ...r, value: Number(r.value) })),
  };
}

export async function loadKpiDefinitions(): Promise<KpiDefinition[]> {
  const db = getDb();
  const rows = await db.select().from(kpiConfig).orderBy(kpiConfig.kpiId);
  return rows.map((r) => ({
    kpiId: r.kpiId,
    name: r.name,
    weight: Number(r.weight),
    stdValue: Number(r.stdValue),
    stdLabel: r.stdLabel,
    scoring: r.scoring as ScoringMethod,
    toleranceDays: r.toleranceDays,
    aggregation: r.aggregation as KpiDefinition["aggregation"],
    enabled: r.enabled,
  }));
}
