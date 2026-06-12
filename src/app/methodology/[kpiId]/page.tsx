import Link from "next/link";
import { notFound } from "next/navigation";
import { getMethodology } from "@/lib/kpi/methodology";
import { loadKpiDefinitions } from "@/lib/server/dataset";

export const dynamic = "force-dynamic";

export default async function MethodologyPage({
  params,
}: {
  params: Promise<{ kpiId: string }>;
}) {
  const { kpiId: raw } = await params;
  const kpiId = Number(raw);
  if (!Number.isInteger(kpiId) || kpiId < 1 || kpiId > 7) notFound();

  const defs = await loadKpiDefinitions();
  const def = defs.find((d) => d.kpiId === kpiId);
  if (!def) notFound();
  const m = getMethodology(def);

  const others = defs.filter((d) => d.kpiId !== kpiId);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link href="/" className="text-sm text-indigo-700 hover:underline">
          ← Back to dashboard
        </Link>
        <div className="mt-2 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-base font-black text-white">
            {m.kpiId}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {m.title}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Standard: <strong>{def.stdLabel}</strong> · Weight:{" "}
              <strong>{(def.weight * 100).toFixed(0)}%</strong> ·{" "}
              {def.aggregation === "yearly_cumulative"
                ? "cumulative over the year"
                : "calculated per month"}
              {def.toleranceDays !== null && (
                <> · tolerance {def.toleranceDays} days</>
              )}
            </p>
          </div>
        </div>
      </div>

      <Section title="Strategy — what this KPI measures">
        <p className="text-sm leading-relaxed text-slate-700">{m.strategy}</p>
      </Section>

      <Section title="Data sources & how they are merged">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          {m.dataAndMerge.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          The full merged dataset is browsable on the{" "}
          <Link href="/data" className="text-indigo-700 hover:underline">
            Data page
          </Link>
          , including the merge explanation.
        </p>
      </Section>

      <Section title="Monthly calculation — step by step">
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          {m.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </Section>

      <Section title="Formula">
        <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-[12.5px] leading-relaxed text-slate-100">
          {m.formulas.join("\n")}
        </pre>
      </Section>

      <Section title="Month attribution">
        <p className="text-sm leading-relaxed text-slate-700">{m.attribution}</p>
      </Section>

      <Section title="Edge cases & caveats">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          {m.edgeCases.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </Section>

      <Section title="See the numbers">
        <p className="text-sm text-slate-700">
          On the dashboard, click any{" "}
          <span className="font-semibold text-indigo-700">REAL</span> value of
          this KPI to open the month&apos;s drill-down with every underlying
          row used in the calculation.
        </p>
      </Section>

      <div className="border-t border-slate-200 pt-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Other KPIs
        </p>
        <div className="flex flex-wrap gap-2">
          {others.map((d) => (
            <Link
              key={d.kpiId}
              href={`/methodology/${d.kpiId}`}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            >
              KPI {d.kpiId} — {d.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-900">
        {title}
      </h2>
      {children}
    </section>
  );
}
