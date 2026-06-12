import { describe, expect, it } from "vitest";
import { addDays, inRange, listMonths, monthRange, ytdRange } from "./months";

describe("monthRange", () => {
  it("handles month lengths and leap years", () => {
    expect(monthRange("2025-01")).toEqual({ from: "2025-01-01", to: "2025-01-31" });
    expect(monthRange("2024-02")).toEqual({ from: "2024-02-01", to: "2024-02-29" });
    expect(monthRange("2025-02")).toEqual({ from: "2025-02-01", to: "2025-02-28" });
  });
});

describe("ytdRange", () => {
  it("spans Jan 1 to month end", () => {
    expect(ytdRange("2026-03")).toEqual({ from: "2026-01-01", to: "2026-03-31" });
  });
});

describe("listMonths", () => {
  it("spans year boundaries inclusively", () => {
    expect(listMonths("2025-11-15", "2026-02-03")).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });
});

describe("addDays / inRange", () => {
  it("adds tolerance across month ends", () => {
    expect(addDays("2025-06-28", 7)).toBe("2025-07-05");
  });
  it("checks inclusive bounds", () => {
    const r = monthRange("2025-06");
    expect(inRange("2025-06-01", r)).toBe(true);
    expect(inRange("2025-06-30", r)).toBe(true);
    expect(inRange("2025-07-01", r)).toBe(false);
  });
});
