CREATE TABLE "kpi_appraisals" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"task_id" text NOT NULL,
	"realization" text,
	"self_score" integer,
	"self_note" text,
	"manager_score" integer,
	"manager_note" text,
	"final_score" integer,
	"notes_on_achievement" text,
	"calibrated_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kpi_appraisals_task_id_unique" UNIQUE("task_id")
);
--> statement-breakpoint
CREATE TABLE "kpi_epics" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"scorecard_id" text NOT NULL,
	"name" text NOT NULL,
	"weight" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"task_id" text NOT NULL,
	"from_user_id" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"task_id" text NOT NULL,
	"percent" integer NOT NULL,
	"note" text,
	"evidence_path" text,
	"evidence_name" text,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_scorecards" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"period_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"manager_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"revision_note" text,
	"agreed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kpi_scorecards_period_id_employee_id_unique" UNIQUE("period_id","employee_id")
);
--> statement-breakpoint
CREATE TABLE "kpi_subtasks" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"task_id" text NOT NULL,
	"title" text NOT NULL,
	"is_done" boolean DEFAULT false NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"epic_id" text NOT NULL,
	"title" text NOT NULL,
	"weight" integer NOT NULL,
	"target_note" text,
	"rubric" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kpi_appraisals" ADD CONSTRAINT "kpi_appraisals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_appraisals" ADD CONSTRAINT "kpi_appraisals_task_id_kpi_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."kpi_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_epics" ADD CONSTRAINT "kpi_epics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_epics" ADD CONSTRAINT "kpi_epics_scorecard_id_kpi_scorecards_id_fk" FOREIGN KEY ("scorecard_id") REFERENCES "public"."kpi_scorecards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_feedback" ADD CONSTRAINT "kpi_feedback_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_feedback" ADD CONSTRAINT "kpi_feedback_task_id_kpi_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."kpi_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_progress" ADD CONSTRAINT "kpi_progress_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_progress" ADD CONSTRAINT "kpi_progress_task_id_kpi_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."kpi_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_scorecards" ADD CONSTRAINT "kpi_scorecards_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_scorecards" ADD CONSTRAINT "kpi_scorecards_period_id_kpi_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."kpi_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_scorecards" ADD CONSTRAINT "kpi_scorecards_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_subtasks" ADD CONSTRAINT "kpi_subtasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_subtasks" ADD CONSTRAINT "kpi_subtasks_task_id_kpi_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."kpi_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_tasks" ADD CONSTRAINT "kpi_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_tasks" ADD CONSTRAINT "kpi_tasks_epic_id_kpi_epics_id_fk" FOREIGN KEY ("epic_id") REFERENCES "public"."kpi_epics"("id") ON DELETE cascade ON UPDATE no action;