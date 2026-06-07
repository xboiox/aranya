CREATE TABLE "kpi_evaluations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"period" text NOT NULL,
	"score" integer NOT NULL,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"approver_id" text,
	"decided_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kpi_evaluations_employee_id_period_unique" UNIQUE("employee_id","period")
);
--> statement-breakpoint
ALTER TABLE "kpi_evaluations" ADD CONSTRAINT "kpi_evaluations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_evaluations" ADD CONSTRAINT "kpi_evaluations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_evaluations" ADD CONSTRAINT "kpi_evaluations_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;