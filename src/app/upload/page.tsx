import { UploadForm } from "@/components/upload-form";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Upload monthly exports
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload the latest <strong>PO</strong> and <strong>PR TO GR</strong>{" "}
          CSV exports. Re-uploading is safe: existing rows are matched and
          updated, new rows are added, and KPI results are recalculated for
          every month in the data.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
