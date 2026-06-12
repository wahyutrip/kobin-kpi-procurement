import { DataTable, type DataTableRow } from "@/components/data-table";
import { getUploadHistory } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

export default async function UploadsPage() {
  const history = await getUploadHistory();

  const rows: DataTableRow[] = history.map((u) => ({
    uploadedAt: u.uploadedAt.toLocaleString("en-GB", {
      timeZone: "Asia/Jakarta",
    }),
    fileName: u.fileName,
    fileType: u.fileType === "po" ? "PO" : "PR TO GR",
    status: u.status,
    totalRows: u.stats?.totalRows ?? null,
    inserted: u.stats?.inserted ?? null,
    updated: u.stats?.updated ?? null,
    skipped: u.stats?.skipped ?? null,
    warnings: u.warnings?.length ?? 0,
    errors: u.validationErrors?.length ?? 0,
    details: `/uploads/${u.id}`,
    file: u.hasRawContent ? `/api/uploads/${u.id}/download` : null,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Upload history
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Every import with its stats. Open a row for warnings, what to check,
          and the original file.
        </p>
      </div>
      <DataTable
        rows={rows}
        fileName="upload-history"
        defaultPageSize={20}
        columns={[
          { key: "uploadedAt", label: "Uploaded at" },
          { key: "fileName", label: "File" },
          { key: "fileType", label: "Type" },
          { key: "status", label: "Status", kind: "badge" },
          { key: "totalRows", label: "Rows" },
          { key: "inserted", label: "Inserted" },
          { key: "updated", label: "Updated" },
          { key: "skipped", label: "Skipped" },
          { key: "warnings", label: "Warnings" },
          { key: "errors", label: "Errors" },
          { key: "details", label: "Details", kind: "link", linkLabel: "View" },
          { key: "file", label: "File", kind: "link", linkLabel: "Download" },
        ]}
      />
    </div>
  );
}
