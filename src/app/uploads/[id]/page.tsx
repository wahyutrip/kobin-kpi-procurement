import Link from "next/link";
import { notFound } from "next/navigation";
import { DataTable, type DataTableRow } from "@/components/data-table";
import { guidanceFor } from "@/lib/ingest/warning-guidance";
import { getUploadDetail } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function UploadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const upload = await getUploadDetail(id);
  if (!upload) notFound();

  const warningRows: DataTableRow[] = (upload.warnings ?? []).map((w) => ({
    row: w.row,
    warning: w.message,
    whatToCheck: guidanceFor(w.message),
  }));
  const errorRows: DataTableRow[] = (upload.validationErrors ?? []).map(
    (e) => ({
      row: e.row,
      field: e.field,
      error: e.message,
      whatToCheck: guidanceFor(e.message),
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/uploads" className="text-sm text-indigo-700 hover:underline">
            ← Back to upload history
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {upload.fileName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {upload.fileType === "po" ? "PO export" : "PR TO GR export"} ·
            uploaded{" "}
            {upload.uploadedAt.toLocaleString("en-GB", {
              timeZone: "Asia/Jakarta",
            })}{" "}
            · status <span className="font-semibold">{upload.status}</span>
          </p>
        </div>
        {upload.hasRawContent ? (
          <a
            href={`/api/uploads/${upload.id}/download`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            ↓ Download original file
          </a>
        ) : (
          <span className="text-xs text-slate-400">
            Original file not stored (uploaded before file storage was added)
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Total rows" value={upload.stats?.totalRows} />
        <Stat label="Inserted" value={upload.stats?.inserted} />
        <Stat label="Updated" value={upload.stats?.updated} />
        <Stat label="Skipped" value={upload.stats?.skipped} />
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">
          Data-quality warnings ({warningRows.length})
        </h2>
        <p className="text-sm text-slate-500">
          Warnings never block the import — they point at rows worth verifying
          in the source system. Stored per upload, so this history stays
          available.
        </p>
        {warningRows.length === 0 ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            No warnings for this upload.
          </p>
        ) : (
          <DataTable
            rows={warningRows}
            fileName={`warnings-${upload.fileName}`}
            defaultPageSize={20}
            columns={[
              { key: "row", label: "CSV Row" },
              { key: "warning", label: "Warning" },
              { key: "whatToCheck", label: "What to check" },
            ]}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">
          Validation errors ({errorRows.length})
        </h2>
        <p className="text-sm text-slate-500">
          These rows were skipped during import — fix the cells and re-upload
          the file.
        </p>
        {errorRows.length === 0 ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            No rows were skipped.
          </p>
        ) : (
          <DataTable
            rows={errorRows}
            fileName={`errors-${upload.fileName}`}
            defaultPageSize={20}
            columns={[
              { key: "row", label: "CSV Row" },
              { key: "field", label: "Field" },
              { key: "error", label: "Error" },
              { key: "whatToCheck", label: "What to check" },
            ]}
          />
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {value?.toLocaleString() ?? "–"}
      </p>
    </div>
  );
}
