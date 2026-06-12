CREATE TYPE "public"."file_type" AS ENUM('po', 'pr_gr');--> statement-breakpoint
CREATE TYPE "public"."upload_status" AS ENUM('processing', 'success', 'partial', 'failed');--> statement-breakpoint
CREATE TABLE "kpi_config" (
	"kpi_id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"weight" numeric NOT NULL,
	"std_value" numeric NOT NULL,
	"std_label" text NOT NULL,
	"scoring" text NOT NULL,
	"tolerance_days" integer,
	"aggregation" text DEFAULT 'monthly' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_manual_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" date NOT NULL,
	"kpi_id" integer NOT NULL,
	"value" numeric NOT NULL,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_monthly_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" date NOT NULL,
	"kpi_id" integer NOT NULL,
	"real_value" numeric,
	"std_value" numeric NOT NULL,
	"achievement_pct" numeric,
	"capai" numeric,
	"sample_size" integer DEFAULT 0 NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "po_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pr_no" text NOT NULL,
	"pr_date" date,
	"pr_status" text,
	"item_name_pr" text,
	"required_qty" numeric,
	"required_date" date,
	"request_by" text,
	"po_no" text NOT NULL,
	"po_date" date NOT NULL,
	"lokal_impor" text NOT NULL,
	"po_status" text,
	"vendor_code" text,
	"vendor_name" text,
	"eta" date,
	"currency" text,
	"item_name_po" text NOT NULL,
	"qty_po" numeric,
	"uom_po" text,
	"unit_price" numeric,
	"total_po" numeric,
	"outstanding_qty" numeric,
	"top" text,
	"remarks" text,
	"line_seq" integer DEFAULT 0 NOT NULL,
	"last_upload_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pr_gr_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pr_no" text NOT NULL,
	"pr_date" date NOT NULL,
	"item_group" text,
	"item_code" text NOT NULL,
	"item_name" text,
	"qty_requested" numeric,
	"po_no" text,
	"po_date" date,
	"qty_po" numeric,
	"pr_to_po_days" integer,
	"grpo_no" text,
	"grpo_date" date,
	"qty_grpo" numeric,
	"po_to_grpo_days" integer,
	"line_seq" integer DEFAULT 0 NOT NULL,
	"last_upload_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pr_gr_lines_natural_key" UNIQUE NULLS NOT DISTINCT("pr_no","item_code","po_no","grpo_no","line_seq")
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_type" "file_type" NOT NULL,
	"file_name" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "upload_status" DEFAULT 'processing' NOT NULL,
	"stats" jsonb,
	"validation_errors" jsonb,
	"warnings" jsonb
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_code" text NOT NULL,
	"vendor_name" text NOT NULL,
	"first_po_date" date NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_vendor_code_unique" UNIQUE("vendor_code")
);
--> statement-breakpoint
ALTER TABLE "kpi_manual_entries" ADD CONSTRAINT "kpi_manual_entries_kpi_id_kpi_config_kpi_id_fk" FOREIGN KEY ("kpi_id") REFERENCES "public"."kpi_config"("kpi_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_monthly_results" ADD CONSTRAINT "kpi_monthly_results_kpi_id_kpi_config_kpi_id_fk" FOREIGN KEY ("kpi_id") REFERENCES "public"."kpi_config"("kpi_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_lines" ADD CONSTRAINT "po_lines_last_upload_id_uploads_id_fk" FOREIGN KEY ("last_upload_id") REFERENCES "public"."uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_gr_lines" ADD CONSTRAINT "pr_gr_lines_last_upload_id_uploads_id_fk" FOREIGN KEY ("last_upload_id") REFERENCES "public"."uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "kpi_manual_entries_month_kpi" ON "kpi_manual_entries" USING btree ("month","kpi_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kpi_monthly_results_month_kpi" ON "kpi_monthly_results" USING btree ("month","kpi_id");--> statement-breakpoint
CREATE UNIQUE INDEX "po_lines_natural_key" ON "po_lines" USING btree ("pr_no","po_no","item_name_po","po_date","line_seq");