import { getDb } from "./client";
import { kpiConfig } from "./schema";
import { KPI_CONFIG_DEFAULTS } from "@/lib/kpi/config-defaults";

export async function seedKpiConfig(): Promise<void> {
  const db = getDb();
  for (const cfg of KPI_CONFIG_DEFAULTS) {
    await db
      .insert(kpiConfig)
      .values({
        kpiId: cfg.kpiId,
        name: cfg.name,
        weight: String(cfg.weight),
        stdValue: String(cfg.stdValue),
        stdLabel: cfg.stdLabel,
        scoring: cfg.scoring,
        toleranceDays: cfg.toleranceDays,
        aggregation: cfg.aggregation,
        enabled: cfg.enabled,
      })
      .onConflictDoNothing({ target: kpiConfig.kpiId });
  }
}

async function main() {
  try {
    await seedKpiConfig();
    console.error("✓ kpi_config seeded");
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  void main();
}
