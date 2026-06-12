import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { uploads } from "@/lib/db/schema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid upload id" }, { status: 400 });
  }
  try {
    const db = getDb();
    const [row] = await db
      .select({ fileName: uploads.fileName, rawContent: uploads.rawContent })
      .from(uploads)
      .where(eq(uploads.id, id))
      .limit(1);
    if (!row) {
      return NextResponse.json({ error: "upload not found" }, { status: 404 });
    }
    if (row.rawContent === null) {
      return NextResponse.json(
        { error: "this upload predates file storage — the original file was not kept" },
        { status: 404 },
      );
    }
    const safeName = row.fileName.replace(/[^\w.\- ]/g, "_");
    return new Response(row.rawContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "failed to load the file" },
      { status: 500 },
    );
  }
}
