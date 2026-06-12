import { describe, expect, it } from "vitest";
import { KPI_CONFIG_DEFAULTS } from "./config-defaults";
import { scoreKpi } from "./scoring";
import type { KpiDefinition } from "./types";

const def = (kpiId: number): KpiDefinition =>
  KPI_CONFIG_DEFAULTS.find((d) => d.kpiId === kpiId)!;

describe("scoreKpi — ratio", () => {
  it("matches old sheet KPI1 sample: REAL -0.30% vs STD -1% → 30% → 3 pts", () => {
    const cell = scoreKpi(def(1), { real: -0.3, sampleSize: 10 });
    expect(cell.pct).toBe(30);
    expect(cell.capai).toBe(3);
  });

  it("clamps price increases (positive REAL vs negative STD) to 0%", () => {
    const cell = scoreKpi(def(1), { real: 0.5, sampleSize: 4 });
    expect(cell.pct).toBe(0);
    expect(cell.capai).toBe(0);
  });

  it("caps achievement at 100%: REAL 100% vs STD 95% → 20 pts max", () => {
    const cell = scoreKpi(def(2), { real: 100, sampleSize: 50 });
    expect(cell.pct).toBe(100);
    expect(cell.capai).toBe(20);
  });

  it("matches old sheet KPI2 sample: REAL 83.10% vs STD 95% → ~87.47% → ~17.5 pts", () => {
    const cell = scoreKpi(def(2), { real: 83.1, sampleSize: 100 });
    expect(cell.pct).toBeCloseTo(87.47, 1);
    expect(cell.capai).toBeCloseTo(17.49, 1);
  });

  it("matches old sheet KPI7 sample: 3 of 6 vendors → 50% → 5 pts", () => {
    const cell = scoreKpi(def(7), { real: 3, sampleSize: 3 });
    expect(cell.pct).toBe(50);
    expect(cell.capai).toBe(5);
  });
});

describe("scoreKpi — threshold_max", () => {
  it("full score while within the limit (LKM 0 of max 3)", () => {
    const cell = scoreKpi(def(5), { real: 0, sampleSize: 1 });
    expect(cell.pct).toBe(100);
    expect(cell.capai).toBe(15);
  });

  it("zero score once the limit is exceeded", () => {
    const cell = scoreKpi(def(5), { real: 4, sampleSize: 1 });
    expect(cell.pct).toBe(0);
    expect(cell.capai).toBe(0);
  });
});

describe("scoreKpi — no data", () => {
  it("propagates null real as null pct/capai", () => {
    const cell = scoreKpi(def(5), { real: null, sampleSize: 0 });
    expect(cell.pct).toBeNull();
    expect(cell.capai).toBeNull();
  });
});
