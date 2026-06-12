"use client";

import { useState, useTransition } from "react";
import {
  uploadCsvAction,
  type UploadActionResult,
} from "@/lib/server/upload-action";

type SlotConfig = {
  field: string;
  title: string;
  hint: string;
};

const SLOTS: SlotConfig[] = [
  {
    field: "poFile",
    title: "PO export",
    hint: "PR → PO lines with vendor, ETA, prices (PO.csv)",
  },
  {
    field: "prGrFile",
    title: "PR TO GR export",
    hint: "PR → PO → GRPO receipt dates (PR TO GR.csv)",
  },
];

export function UploadForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<UploadActionResult | null>(null);

  function submit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await uploadCsvAction(formData));
      } catch (err) {
        setResult({
          ok: false,
          message:
            err instanceof Error
              ? `Upload failed: ${err.message}`
              : "Upload failed unexpectedly.",
          files: [],
        });
      }
    });
  }

  return (
    <div className="space-y-5">
      <form action={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {SLOTS.map((slot) => (
            <FileSlot key={slot.field} slot={slot} />
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Upload one or both files — each is optional, so you can provide newer
          data for just one export later.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "Processing… (parse → import → recalculate)"
            : "Upload & recalculate KPIs"}
        </button>
      </form>

      {result && <UploadResultCard result={result} />}
    </div>
  );
}

function FileSlot({ slot }: { slot: SlotConfig }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const input = e.currentTarget.querySelector<HTMLInputElement>("input");
        if (input && e.dataTransfer.files.length > 0) {
          input.files = e.dataTransfer.files;
          setFileName(e.dataTransfer.files[0]?.name ?? null);
        }
      }}
      className={`flex cursor-pointer flex-col rounded-2xl border-2 border-dashed bg-white p-5 transition ${
        dragOver
          ? "border-indigo-500 bg-indigo-50"
          : fileName
            ? "border-emerald-400"
            : "border-slate-300 hover:border-slate-400"
      }`}
    >
      <span className="text-sm font-bold text-slate-900">{slot.title}</span>
      <span className="mt-0.5 text-xs text-slate-500">{slot.hint}</span>
      <span
        className={`mt-3 truncate text-xs font-medium ${
          fileName ? "text-emerald-700" : "text-slate-400"
        }`}
      >
        {fileName ?? "Drop a .csv here or click to choose (optional)"}
      </span>
      <input
        type="file"
        name={slot.field}
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
    </label>
  );
}

function UploadResultCard({ result }: { result: UploadActionResult }) {
  return (
    <div
      className={`rounded-2xl border p-5 text-sm ${
        result.ok
          ? "border-emerald-200 bg-emerald-50"
          : "border-rose-200 bg-rose-50"
      }`}
    >
      <p className="font-semibold text-slate-900">{result.message}</p>
      <div className="mt-3 space-y-3">
        {result.files.map((f, idx) => (
          <div
            key={`${f.fileName}-${idx}`}
            className="rounded-xl bg-white p-4 shadow-sm"
          >
            <p className="font-semibold text-slate-900">
              {f.fileName}
              <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                {f.fileType === "po"
                  ? "PO export"
                  : f.fileType === "pr_gr"
                    ? "PR TO GR export"
                    : "unknown"}
              </span>
              <span
                className={`ml-2 text-xs font-bold uppercase ${
                  f.status === "success"
                    ? "text-emerald-700"
                    : f.status === "partial"
                      ? "text-amber-700"
                      : "text-rose-700"
                }`}
              >
                {f.status}
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {f.totalRows.toLocaleString()} rows —{" "}
              {f.inserted.toLocaleString()} inserted,{" "}
              {f.updated.toLocaleString()} updated, {f.skipped} skipped
            </p>
            {f.errorCount > 0 && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer font-medium text-rose-700">
                  {f.errorCount} validation error(s) — showing first{" "}
                  {f.errors.length}
                </summary>
                <ul className="mt-1 list-inside list-disc text-slate-600">
                  {f.errors.map((e, i) => (
                    <li key={i}>
                      row {e.row}, {e.field}: {e.message}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {f.warningCount > 0 && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer font-medium text-amber-700">
                  {f.warningCount} data-quality warning(s) — showing first{" "}
                  {f.warnings.length}
                </summary>
                <ul className="mt-1 list-inside list-disc text-slate-600">
                  {f.warnings.map((w, i) => (
                    <li key={i}>
                      row {w.row}: {w.message}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
