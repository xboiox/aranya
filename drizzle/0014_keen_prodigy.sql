CREATE TABLE "kpi_appraisals" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"kpi_id" text NOT NULL,
	"self_score" integer,
	"self_note" text,
	"manager_score" integer,
	"manager_note" text,
	"final_score" integer,
	"calibrated_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kpi_appraisals_kpi_id_unique" UNIQUE("kpi_id")
);
--> statement-breakpoint
ALTER TABLE "kpi_appraisals" ADD CONSTRAINT "kpi_appraisals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_appraisals" ADD CONSTRAINT "kpi_appraisals_kpi_id_kpis_id_fk" FOREIGN KEY ("kpi_id") REFERENCES "public"."kpis"("id") ON DELETE cascade ON UPDATE no action;