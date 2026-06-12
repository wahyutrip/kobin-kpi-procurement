export function formatReal(kpiId: number, real: number | null): string {
  if (real === null) return "–";
  if (kpiId === 1) return `${real.toFixed(2)}%`;
  if (kpiId === 2 || kpiId === 3 || kpiId === 4) return `${real.toFixed(1)}%`;
  return String(Math.round(real * 100) / 100);
}

export function formatPct(pct: number | null): string {
  return pct === null ? "–" : `${pct.toFixed(0)}%`;
}

export function formatCapai(capai: number | null): string {
  return capai === null ? "–" : capai.toFixed(1);
}

/** Badge classes color-coding achievement %. */
export function pctBadge(pct: number | null): string {
  if (pct === null) return "text-slate-400";
  if (pct >= 95) return "bg-emerald-100 text-emerald-900";
  if (pct >= 80) return "bg-amber-100 text-amber-900";
  return "bg-rose-100 text-rose-900";
}

export function monthLabel(period: string): string {
  if (period.endsWith("YTD")) return period.replace("-", " ");
  const [y, m] = period.split("-");
  const names = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${names[Number(m) - 1]} ${y.slice(2)}`;
}
