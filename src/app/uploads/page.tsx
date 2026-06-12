import { getUploadHistory } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

export default async function UploadsPage() {
  const history = await getUploadHistory();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Upload history</h1>
      {history.length === 0 ? (
        <p className="text-sm text-slate-500">No uploads yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs">
              <tr>
                <th className="border-b border-slate-200 px-3 py-2">Uploaded at</th>
                <th className="border-b border-slate-200 px-3 py-2">File</th>
                <th className="border-b border-slate-200 px-3 py-2">Type</th>
                <th className="border-b border-slate-200 px-3 py-2">Status</th>
                <th className="border-b border-slate-200 px-3 py-2">Rows</th>
                <th className="border-b border-slate-200 px-3 py-2">Inserted</th>
                <th className="border-b border-slate-200 px-3 py-2">Updated</th>
                <th className="border-b border-slate-200 px-3 py-2">Skipped</th>
                <th className="border-b border-slate-200 px-3 py-2">Warnings</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {history.map((u) => (
                <tr key={u.id} className="even:bg-slate-50/50">
                  <td className="border-b border-slate-100 px-3 py-2">
                    {u.uploadedAt.toLocaleString("en-GB", { timeZone: "Asia/Jakarta" })}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">{u.fileName}</td>
                  <td className="border-b border-slate-100 px-3 py-2 uppercase">
                    {u.fileType === "po" ? "PO" : "PR TO GR"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    {u.stats?.totalRows?.toLocaleString() ?? "–"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    {u.stats?.inserted?.toLocaleString() ?? "–"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    {u.stats?.updated?.toLocaleString() ?? "–"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    {u.stats?.skipped ?? "–"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    {u.warnings?.length ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: "bg-emerald-100 text-emerald-800",
    partial: "bg-amber-100 text-amber-800",
    failed: "bg-red-100 text-red-800",
    processing: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 font-medium ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}
