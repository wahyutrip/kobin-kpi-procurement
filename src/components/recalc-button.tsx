"use client";

import { useState, useTransition } from "react";
import { recalcAction, type RecalcResult } from "@/lib/server/recalc-action";

export function RecalcButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<RecalcResult | null>(null);

  function run() {
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await recalcAction());
      } catch (err) {
        setResult({
          ok: false,
          message:
            err instanceof Error
              ? `Recalculation failed: ${err.message}`
              : "Recalculation failed unexpectedly.",
        });
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={isPending}
        className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-300 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Recalculating…" : "Recalculate KPIs"}
      </button>
      {result && (
        <span
          className={`text-sm font-medium ${
            result.ok ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {result.message}
        </span>
      )}
    </div>
  );
}
