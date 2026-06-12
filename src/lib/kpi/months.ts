import type { DateRange } from "./types";

/** "2025-03" from an ISO date. */
export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function monthRange(month: string): DateRange {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** Jan 1st of the month's year through the end of that month. */
export function ytdRange(month: string): DateRange {
  return { from: `${month.slice(0, 4)}-01-01`, to: monthRange(month).to };
}

export function inRange(isoDate: string, range: DateRange): boolean {
  return isoDate >= range.from && isoDate <= range.to;
}

/** Sorted list of "YYYY-MM" between two ISO dates, inclusive. */
export function listMonths(fromIso: string, toIso: string): string[] {
  const months: string[] = [];
  let [y, m] = [Number(fromIso.slice(0, 4)), Number(fromIso.slice(5, 7))];
  const [ey, em] = [Number(toIso.slice(0, 4)), Number(toIso.slice(5, 7))];
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
