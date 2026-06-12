import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  lte,
  max,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { getDb } from "@/lib/db/client";
import { poLines, prGrLines } from "@/lib/db/schema";
import { addDays } from "@/lib/kpi/months";

export type Realisasi = "on_time" | "late" | "outstanding" | "overdue" | "no_eta";

export type MergedRow = {
  prNo: string;
  prDate: string | null;
  poNo: string;
  poDate: string;
  lokalImpor: string;
  vendorName: string | null;
  itemNamePo: string;
  qtyPo: string | null;
  unitPrice: string | null;
  currency: string | null;
  poStatus: string | null;
  eta: string | null;
  grpoDate: string | null;
  deadline: string | null;
  realisasi: Realisasi;
};

export type MergedFilters = {
  q: string;
  prNo: string;
  poNo: string;
  vendor: string;
  item: string;
  scope: "all" | "Lokal" | "Impor";
  currency: string;
  realisasi: "all" | Realisasi;
  prDateFrom: string;
  prDateTo: string;
  poDateFrom: string;
  poDateTo: string;
  etaFrom: string;
  etaTo: string;
  grpoFrom: string;
  grpoTo: string;
};

export type MergedDataQuery = MergedFilters & {
  sort: string;
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
};

export const SORTABLE_COLUMNS = {
  prNo: poLines.prNo,
  prDate: poLines.prDate,
  poNo: poLines.poNo,
  poDate: poLines.poDate,
  vendorName: poLines.vendorName,
  itemNamePo: poLines.itemNamePo,
  unitPrice: poLines.unitPrice,
  eta: poLines.eta,
} as const;

export type SortKey = keyof typeof SORTABLE_COLUMNS;

export const REALISASI_VALUES: readonly Realisasi[] = [
  "on_time",
  "late",
  "outstanding",
  "overdue",
  "no_eta",
];

export const MERGED_CURRENCIES = ["IDR", "USD", "EUR", "RMB"];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse + sanitize the /data search params shared by the page and CSV export. */
export function parseMergedParams(sp: Partial<Record<string, string>>): {
  filters: MergedFilters;
  sort: string;
  dir: "asc" | "desc";
} {
  const text = (v: string | undefined) => (v ?? "").trim().slice(0, 100);
  const date = (v: string | undefined) => {
    const t = (v ?? "").trim();
    return ISO_DATE.test(t) ? t : "";
  };
  return {
    filters: {
      q: text(sp.q),
      prNo: text(sp.prNo),
      poNo: text(sp.poNo),
      vendor: text(sp.vendor),
      item: text(sp.item),
      scope: sp.scope === "Lokal" || sp.scope === "Impor" ? sp.scope : "all",
      currency: MERGED_CURRENCIES.includes(sp.currency ?? "") ? sp.currency! : "",
      realisasi: REALISASI_VALUES.includes(sp.realisasi as Realisasi)
        ? (sp.realisasi as Realisasi)
        : "all",
      prDateFrom: date(sp.prDateFrom),
      prDateTo: date(sp.prDateTo),
      poDateFrom: date(sp.poDateFrom),
      poDateTo: date(sp.poDateTo),
      etaFrom: date(sp.etaFrom),
      etaTo: date(sp.etaTo),
      grpoFrom: date(sp.grpoFrom),
      grpoTo: date(sp.grpoTo),
    },
    sort: sp.sort && sp.sort in SORTABLE_COLUMNS ? sp.sort : "poDate",
    dir: sp.dir === "asc" ? "asc" : "desc",
  };
}

function realisasiOf(
  row: { lokalImpor: string; eta: string | null; grpoDate: string | null },
  today: string,
): Realisasi {
  if (!row.eta) return "no_eta";
  const tolerance = row.lokalImpor === "Lokal" ? 7 : 14;
  const deadline = addDays(row.eta, tolerance);
  if (!row.grpoDate) return today > deadline ? "overdue" : "outstanding";
  return row.grpoDate <= deadline ? "on_time" : "late";
}

export async function getMergedData(query: MergedDataQuery): Promise<{
  rows: MergedRow[];
  totalRows: number;
}> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const grpo = db
    .select({
      poNo: prGrLines.poNo,
      grpoDate: max(prGrLines.grpoDate).as("grpo_date"),
    })
    .from(prGrLines)
    .groupBy(prGrLines.poNo)
    .as("grpo");

  const grpoDateCol = grpo.grpoDate;
  // deadline = ETA + tolerance days (7 Lokal / 14 Impor), matching KPI 2/3
  const deadlineSql = sql`(${poLines.eta} + (case when ${poLines.lokalImpor} = 'Lokal' then 7 else 14 end))`;

  const conditions: SQL[] = [];
  const pushIlike = (col: AnyPgColumn, value: string) => {
    if (value) conditions.push(ilike(col, `%${value}%`));
  };
  const pushRange = (col: AnyPgColumn, from: string, to: string) => {
    if (from) conditions.push(gte(col, from));
    if (to) conditions.push(lte(col, to));
  };

  if (query.q) {
    const term = `%${query.q}%`;
    const c = or(
      ilike(poLines.poNo, term),
      ilike(poLines.prNo, term),
      ilike(poLines.vendorName, term),
      ilike(poLines.itemNamePo, term),
    );
    if (c) conditions.push(c);
  }
  pushIlike(poLines.prNo, query.prNo);
  pushIlike(poLines.poNo, query.poNo);
  pushIlike(poLines.vendorName, query.vendor);
  pushIlike(poLines.itemNamePo, query.item);
  if (query.scope !== "all") conditions.push(eq(poLines.lokalImpor, query.scope));
  if (query.currency) conditions.push(eq(poLines.currency, query.currency));
  pushRange(poLines.prDate, query.prDateFrom, query.prDateTo);
  pushRange(poLines.poDate, query.poDateFrom, query.poDateTo);
  pushRange(poLines.eta, query.etaFrom, query.etaTo);
  if (query.grpoFrom) {
    conditions.push(sql`${grpoDateCol} >= ${query.grpoFrom}::date`);
  }
  if (query.grpoTo) {
    conditions.push(sql`${grpoDateCol} <= ${query.grpoTo}::date`);
  }

  if (query.realisasi !== "all") {
    const received = isNotNull(grpoDateCol);
    const notReceived = isNull(grpoDateCol);
    const hasEta = isNotNull(poLines.eta);
    const byStatus: Record<Realisasi, SQL | undefined> = {
      on_time: and(hasEta, received, sql`${grpoDateCol} <= ${deadlineSql}`),
      late: and(hasEta, received, sql`${grpoDateCol} > ${deadlineSql}`),
      overdue: and(hasEta, notReceived, sql`${today}::date > ${deadlineSql}`),
      outstanding: and(hasEta, notReceived, sql`${today}::date <= ${deadlineSql}`),
      no_eta: isNull(poLines.eta),
    };
    const c = byStatus[query.realisasi];
    if (c) conditions.push(c);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const sortCol = SORTABLE_COLUMNS[query.sort as SortKey] ?? poLines.poDate;
  const orderBy = query.dir === "asc" ? asc(sortCol) : desc(sortCol);

  const baseSelect = {
    prNo: poLines.prNo,
    prDate: poLines.prDate,
    poNo: poLines.poNo,
    poDate: poLines.poDate,
    lokalImpor: poLines.lokalImpor,
    vendorName: poLines.vendorName,
    itemNamePo: poLines.itemNamePo,
    qtyPo: poLines.qtyPo,
    unitPrice: poLines.unitPrice,
    currency: poLines.currency,
    poStatus: poLines.poStatus,
    eta: poLines.eta,
    grpoDate: sql<string | null>`${grpoDateCol}`,
  };

  const [rows, [{ total }]] = await Promise.all([
    db
      .select(baseSelect)
      .from(poLines)
      .leftJoin(grpo, eq(poLines.poNo, grpo.poNo))
      .where(where)
      .orderBy(orderBy, asc(poLines.poNo))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db
      .select({ total: count() })
      .from(poLines)
      .leftJoin(grpo, eq(poLines.poNo, grpo.poNo))
      .where(where),
  ]);

  const merged = rows.map((r) => {
    const tolerance = r.lokalImpor === "Lokal" ? 7 : 14;
    return {
      ...r,
      deadline: r.eta ? addDays(r.eta, tolerance) : null,
      realisasi: realisasiOf(r, today),
    };
  });

  return { rows: merged, totalRows: Number(total) };
}
