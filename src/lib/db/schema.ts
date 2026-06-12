import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const uploadStatusEnum = pgEnum("upload_status", [
  "processing",
  "success",
  "partial",
  "failed",
]);

export const fileTypeEnum = pgEnum("file_type", ["po", "pr_gr"]);

export const uploads = pgTable("uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileType: fileTypeEnum("file_type").notNull(),
  fileName: text("file_name").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: uploadStatusEnum("status").notNull().default("processing"),
  stats: jsonb("stats").$type<{
    totalRows: number;
    inserted: number;
    updated: number;
    skipped: number;
  }>(),
  validationErrors: jsonb("validation_errors").$type<
    Array<{ row: number; field: string; message: string }>
  >(),
  warnings: jsonb("warnings").$type<
    Array<{ row: number; message: string }>
  >(),
});

export const poLines = pgTable(
  "po_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prNo: text("pr_no").notNull(),
    prDate: date("pr_date"),
    prStatus: text("pr_status"),
    itemNamePr: text("item_name_pr"),
    requiredQty: numeric("required_qty"),
    requiredDate: date("required_date"),
    requestBy: text("request_by"),
    poNo: text("po_no").notNull(),
    poDate: date("po_date").notNull(),
    lokalImpor: text("lokal_impor").notNull(),
    poStatus: text("po_status"),
    vendorCode: text("vendor_code"),
    vendorName: text("vendor_name"),
    eta: date("eta"),
    currency: text("currency"),
    itemNamePo: text("item_name_po").notNull(),
    qtyPo: numeric("qty_po"),
    uomPo: text("uom_po"),
    unitPrice: numeric("unit_price"),
    totalPo: numeric("total_po"),
    outstandingQty: numeric("outstanding_qty"),
    top: text("top"),
    remarks: text("remarks"),
    // occurrence index among rows sharing the same natural key (partial/split lines)
    lineSeq: integer("line_seq").notNull().default(0),
    lastUploadId: uuid("last_upload_id").references(() => uploads.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("po_lines_natural_key").on(
      t.prNo,
      t.poNo,
      t.itemNamePo,
      t.poDate,
      t.lineSeq,
    ),
  ],
);

export const prGrLines = pgTable(
  "pr_gr_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prNo: text("pr_no").notNull(),
    prDate: date("pr_date").notNull(),
    itemGroup: text("item_group"),
    itemCode: text("item_code").notNull(),
    itemName: text("item_name"),
    qtyRequested: numeric("qty_requested"),
    poNo: text("po_no"),
    poDate: date("po_date"),
    qtyPo: numeric("qty_po"),
    prToPoDays: integer("pr_to_po_days"),
    grpoNo: text("grpo_no"),
    grpoDate: date("grpo_date"),
    qtyGrpo: numeric("qty_grpo"),
    poToGrpoDays: integer("po_to_grpo_days"),
    lineSeq: integer("line_seq").notNull().default(0),
    lastUploadId: uuid("last_upload_id").references(() => uploads.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("pr_gr_lines_natural_key")
      .on(t.prNo, t.itemCode, t.poNo, t.grpoNo, t.lineSeq)
      .nullsNotDistinct(),
  ],
);

export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendorCode: text("vendor_code").notNull().unique(),
  vendorName: text("vendor_name").notNull(),
  firstPoDate: date("first_po_date").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const kpiConfig = pgTable("kpi_config", {
  kpiId: integer("kpi_id").primaryKey(),
  name: text("name").notNull(),
  // weight as fraction, e.g. 0.20 for 20%
  weight: numeric("weight").notNull(),
  stdValue: numeric("std_value").notNull(),
  stdLabel: text("std_label").notNull(),
  // 'ratio' (real/std) | 'threshold_max' (100% while real <= std)
  scoring: text("scoring").notNull(),
  toleranceDays: integer("tolerance_days"),
  // 'monthly' | 'yearly_cumulative'
  aggregation: text("aggregation").notNull().default("monthly"),
  enabled: boolean("enabled").notNull().default(true),
});

export const kpiManualEntries = pgTable(
  "kpi_manual_entries",
  {
    id: serial("id").primaryKey(),
    month: date("month").notNull(),
    kpiId: integer("kpi_id")
      .notNull()
      .references(() => kpiConfig.kpiId),
    value: numeric("value").notNull(),
    notes: text("notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("kpi_manual_entries_month_kpi").on(t.month, t.kpiId)],
);

export const kpiMonthlyResults = pgTable(
  "kpi_monthly_results",
  {
    id: serial("id").primaryKey(),
    month: date("month").notNull(),
    kpiId: integer("kpi_id")
      .notNull()
      .references(() => kpiConfig.kpiId),
    realValue: numeric("real_value"),
    stdValue: numeric("std_value").notNull(),
    achievementPct: numeric("achievement_pct"),
    capai: numeric("capai"),
    sampleSize: integer("sample_size").notNull().default(0),
    calculatedAt: timestamp("calculated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("kpi_monthly_results_month_kpi").on(t.month, t.kpiId)],
);
