import { sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { poLines, prGrLines, vendors } from "@/lib/db/schema";
import type { PoLineInput, PrGrLineInput } from "@/lib/csv/types";
import { withLineSeq } from "./line-seq";

export type UpsertStats = { inserted: number; updated: number };

const CHUNK_SIZE = 1000;

function chunk<T>(rows: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    out.push(rows.slice(i, i + size) as T[]);
  }
  return out;
}

const numStr = (n: number | null): string | null =>
  n === null ? null : String(n);

const insertedFlag = sql<number>`(xmax = 0)::int`;

function tally(returned: Array<{ inserted: number }>): UpsertStats {
  let inserted = 0;
  for (const r of returned) inserted += Number(r.inserted);
  return { inserted, updated: returned.length - inserted };
}

function mergeStats(a: UpsertStats, b: UpsertStats): UpsertStats {
  return { inserted: a.inserted + b.inserted, updated: a.updated + b.updated };
}

export async function upsertPoLines(
  db: Db,
  rows: readonly PoLineInput[],
  uploadId: string,
): Promise<UpsertStats> {
  const seqRows = withLineSeq(rows, (r) =>
    [r.prNo, r.poNo, r.itemNamePo, r.poDate].join("|"),
  );
  let stats: UpsertStats = { inserted: 0, updated: 0 };
  for (const batch of chunk(seqRows, CHUNK_SIZE)) {
    const values = batch.map((r) => ({
      prNo: r.prNo,
      prDate: r.prDate,
      prStatus: r.prStatus,
      itemNamePr: r.itemNamePr,
      requiredQty: numStr(r.requiredQty),
      requiredDate: r.requiredDate,
      requestBy: r.requestBy,
      poNo: r.poNo,
      poDate: r.poDate,
      lokalImpor: r.lokalImpor,
      poStatus: r.poStatus,
      vendorCode: r.vendorCode,
      vendorName: r.vendorName,
      eta: r.eta,
      currency: r.currency,
      itemNamePo: r.itemNamePo,
      qtyPo: numStr(r.qtyPo),
      uomPo: r.uomPo,
      unitPrice: numStr(r.unitPrice),
      totalPo: numStr(r.totalPo),
      outstandingQty: numStr(r.outstandingQty),
      top: r.top,
      remarks: r.remarks,
      lineSeq: r.lineSeq,
      lastUploadId: uploadId,
    }));
    const returned = await db
      .insert(poLines)
      .values(values)
      .onConflictDoUpdate({
        target: [
          poLines.prNo,
          poLines.poNo,
          poLines.itemNamePo,
          poLines.poDate,
          poLines.lineSeq,
        ],
        set: {
          prDate: sql`excluded.pr_date`,
          prStatus: sql`excluded.pr_status`,
          itemNamePr: sql`excluded.item_name_pr`,
          requiredQty: sql`excluded.required_qty`,
          requiredDate: sql`excluded.required_date`,
          requestBy: sql`excluded.request_by`,
          lokalImpor: sql`excluded.lokal_impor`,
          poStatus: sql`excluded.po_status`,
          vendorCode: sql`excluded.vendor_code`,
          vendorName: sql`excluded.vendor_name`,
          eta: sql`excluded.eta`,
          currency: sql`excluded.currency`,
          qtyPo: sql`excluded.qty_po`,
          uomPo: sql`excluded.uom_po`,
          unitPrice: sql`excluded.unit_price`,
          totalPo: sql`excluded.total_po`,
          outstandingQty: sql`excluded.outstanding_qty`,
          top: sql`excluded.top`,
          remarks: sql`excluded.remarks`,
          lastUploadId: sql`excluded.last_upload_id`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ inserted: insertedFlag });
    stats = mergeStats(stats, tally(returned));
  }
  return stats;
}

export async function upsertPrGrLines(
  db: Db,
  rows: readonly PrGrLineInput[],
  uploadId: string,
): Promise<UpsertStats> {
  const seqRows = withLineSeq(rows, (r) =>
    [r.prNo, r.itemCode, r.poNo ?? "", r.grpoNo ?? ""].join("|"),
  );
  let stats: UpsertStats = { inserted: 0, updated: 0 };
  for (const batch of chunk(seqRows, CHUNK_SIZE)) {
    const values = batch.map((r) => ({
      prNo: r.prNo,
      prDate: r.prDate,
      itemGroup: r.itemGroup,
      itemCode: r.itemCode,
      itemName: r.itemName,
      qtyRequested: numStr(r.qtyRequested),
      poNo: r.poNo,
      poDate: r.poDate,
      qtyPo: numStr(r.qtyPo),
      prToPoDays: r.prToPoDays,
      grpoNo: r.grpoNo,
      grpoDate: r.grpoDate,
      qtyGrpo: numStr(r.qtyGrpo),
      poToGrpoDays: r.poToGrpoDays,
      lineSeq: r.lineSeq,
      lastUploadId: uploadId,
    }));
    const returned = await db
      .insert(prGrLines)
      .values(values)
      .onConflictDoUpdate({
        target: [
          prGrLines.prNo,
          prGrLines.itemCode,
          prGrLines.poNo,
          prGrLines.grpoNo,
          prGrLines.lineSeq,
        ],
        set: {
          prDate: sql`excluded.pr_date`,
          itemGroup: sql`excluded.item_group`,
          itemName: sql`excluded.item_name`,
          qtyRequested: sql`excluded.qty_requested`,
          poDate: sql`excluded.po_date`,
          qtyPo: sql`excluded.qty_po`,
          prToPoDays: sql`excluded.pr_to_po_days`,
          grpoDate: sql`excluded.grpo_date`,
          qtyGrpo: sql`excluded.qty_grpo`,
          poToGrpoDays: sql`excluded.po_to_grpo_days`,
          lastUploadId: sql`excluded.last_upload_id`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ inserted: insertedFlag });
    stats = mergeStats(stats, tally(returned));
  }
  return stats;
}

/** Maintain vendors.first_po_date = earliest PO date ever seen per vendor. */
export async function upsertVendors(
  db: Db,
  rows: readonly PoLineInput[],
): Promise<void> {
  const earliest = new Map<string, { name: string; date: string }>();
  for (const r of rows) {
    if (!r.vendorCode || !r.vendorName) continue;
    const current = earliest.get(r.vendorCode);
    if (!current || r.poDate < current.date) {
      earliest.set(r.vendorCode, { name: r.vendorName, date: r.poDate });
    }
  }
  const values = [...earliest.entries()].map(([code, v]) => ({
    vendorCode: code,
    vendorName: v.name,
    firstPoDate: v.date,
  }));
  for (const batch of chunk(values, CHUNK_SIZE)) {
    await db
      .insert(vendors)
      .values(batch)
      .onConflictDoUpdate({
        target: vendors.vendorCode,
        set: {
          vendorName: sql`excluded.vendor_name`,
          firstPoDate: sql`least(${vendors.firstPoDate}, excluded.first_po_date)`,
          updatedAt: sql`now()`,
        },
      });
  }
}
