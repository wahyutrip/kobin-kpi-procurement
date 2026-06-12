"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { uploads } from "@/lib/db/schema";
import { parsePoCsv } from "@/lib/csv/parse-po";
import { parsePrGrCsv } from "@/lib/csv/parse-pr-gr";
import type { RowError } from "@/lib/csv/types";
import {
  detectPoAnomalies,
  detectPrGrAnomalies,
  type Warning,
} from "@/lib/ingest/anomalies";
import {
  upsertPoLines,
  upsertPrGrLines,
  upsertVendors,
} from "@/lib/ingest/upsert";
import { getEnv } from "@/lib/env";
import { recalculateKpis } from "./recalc";

const MAX_REPORTED = 20;

export type FileUploadResult = {
  fileName: string;
  fileType: "po" | "pr_gr" | "unknown";
  status: "success" | "partial" | "failed";
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: RowError[];
  errorCount: number;
  warnings: Warning[];
  warningCount: number;
};

export type UploadActionResult = {
  ok: boolean;
  message: string;
  files: FileUploadResult[];
};

function detectFileType(content: string): "po" | "pr_gr" | "unknown" {
  const firstLine = content.slice(0, 300);
  if (firstLine.includes("No. PR") && firstLine.includes("Tanggal PR")) {
    return "po";
  }
  if (firstLine.includes("PR No") && firstLine.includes("GRPO No")) {
    return "pr_gr";
  }
  return "unknown";
}

const SLOT_LABELS: Record<"po" | "pr_gr", string> = {
  po: "PO export",
  pr_gr: "PR TO GR export",
};

async function ingestFile(
  file: File,
  expectedType: "po" | "pr_gr",
): Promise<FileUploadResult> {
  const env = getEnv();
  const failed = (message: string): FileUploadResult => ({
    fileName: file.name,
    fileType: "unknown",
    status: "failed",
    totalRows: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [{ row: 0, field: "file", message }],
    errorCount: 1,
    warnings: [],
    warningCount: 0,
  });

  if (file.size > env.MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
    return failed(`file exceeds ${env.MAX_UPLOAD_SIZE_MB} MB limit`);
  }
  const content = await file.text();
  const fileType = detectFileType(content);
  if (fileType === "unknown") {
    return failed(
      `unrecognized file — expected the ${SLOT_LABELS[expectedType]}`,
    );
  }
  if (fileType !== expectedType) {
    return failed(
      `this looks like the ${SLOT_LABELS[fileType]}, but it was uploaded in the ${SLOT_LABELS[expectedType]} field — please swap the files`,
    );
  }

  const db = getDb();
  const [uploadRow] = await db
    .insert(uploads)
    .values({ fileType, fileName: file.name, rawContent: content })
    .returning({ id: uploads.id });

  try {
    let stats: { inserted: number; updated: number };
    let warnings: Warning[];
    let parsed: { totalRows: number; errors: RowError[]; rows: unknown[] };
    if (fileType === "po") {
      const p = parsePoCsv(content);
      parsed = p;
      stats = await upsertPoLines(db, p.rows, uploadRow.id);
      await upsertVendors(db, p.rows);
      warnings = detectPoAnomalies(p.rows);
    } else {
      const p = parsePrGrCsv(content);
      parsed = p;
      stats = await upsertPrGrLines(db, p.rows, uploadRow.id);
      warnings = detectPrGrAnomalies(p.rows);
    }

    const skipped = parsed.errors.length;
    const status =
      skipped === 0 ? "success" : parsed.rows.length > 0 ? "partial" : "failed";
    await db
      .update(uploads)
      .set({
        status,
        stats: {
          totalRows: parsed.totalRows,
          inserted: stats.inserted,
          updated: stats.updated,
          skipped,
        },
        validationErrors: parsed.errors.slice(0, 200),
        warnings: warnings.slice(0, 200),
      })
      .where(eq(uploads.id, uploadRow.id));

    return {
      fileName: file.name,
      fileType,
      status,
      totalRows: parsed.totalRows,
      inserted: stats.inserted,
      updated: stats.updated,
      skipped,
      errors: parsed.errors.slice(0, MAX_REPORTED),
      errorCount: parsed.errors.length,
      warnings: warnings.slice(0, MAX_REPORTED),
      warningCount: warnings.length,
    };
  } catch (err) {
    await db
      .update(uploads)
      .set({ status: "failed" })
      .where(eq(uploads.id, uploadRow.id));
    return failed(
      err instanceof Error ? `import failed: ${err.message}` : "import failed",
    );
  }
}

export async function uploadCsvAction(
  formData: FormData,
): Promise<UploadActionResult> {
  const slots: Array<{ field: string; type: "po" | "pr_gr" }> = [
    { field: "poFile", type: "po" },
    { field: "prGrFile", type: "pr_gr" },
  ];
  const files = slots.flatMap(({ field, type }) => {
    const f = formData.get(field);
    return f instanceof File && f.size > 0 ? [{ file: f, type }] : [];
  });
  if (files.length === 0) {
    return { ok: false, message: "No files selected — choose at least one export.", files: [] };
  }

  const results: FileUploadResult[] = [];
  for (const { file, type } of files) {
    results.push(await ingestFile(file, type));
  }

  const anyIngested = results.some((r) => r.status !== "failed");
  if (anyIngested) {
    try {
      await recalculateKpis();
    } catch (err) {
      return {
        ok: false,
        message: `Data imported but KPI recalculation failed: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
        files: results,
      };
    }
    revalidatePath("/");
    revalidatePath("/uploads");
  }

  return {
    ok: anyIngested,
    message: anyIngested
      ? "Upload processed and KPIs recalculated."
      : "Upload failed — no rows imported.",
    files: results,
  };
}
