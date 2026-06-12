import { pgTable, text, timestamp, integer, date, boolean, jsonb, unique } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { employees } from "./employees"

// Status siklus penilaian (dikelola HR).
export const KPI_PERIOD_STATUS = {
  PLANNING: "planning",
  ACTIVE: "active",
  APPRAISAL: "appraisal",
  LOCKED: "locked",
} as const

export const KPI_PERIOD_TYPE = {
  QUARTERLY: "quarterly",
  ANNUAL: "annual",
} as const

// Status goal-agreement (kini di tingkat scorecard, bukan per-task).
export const SCORECARD_STATUS = {
  DRAFT: "draft",
  PROPOSED: "proposed",
  AGREED: "agreed",
  REVISION_REQUESTED: "revision_requested",
} as const

// Satu baris rubrik "Predefined KPI Score" (skor 1–5 → kriteria; target = 3).
export interface RubricLevel {
  score: number
  criteria: string
}

export const kpiPeriods = pgTable("kpi_periods", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // quarterly | annual
  startDate: date("start_date", { mode: "date" }).notNull(),
  endDate: date("end_date", { mode: "date" }).notNull(),
  status: text("status").default("planning").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})

// Target perusahaan top-down — referensi yang dilihat manajer (Fase A).
export const companyObjectives = pgTable("company_objectives", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  periodId: text("period_id")
    .notNull()
    .references(() => kpiPeriods.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})

// Scorecard KPI satu karyawan untuk satu periode — pemegang status agreement.
export const kpiScorecards = pgTable(
  "kpi_scorecards",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    periodId: text("period_id")
      .notNull()
      .references(() => kpiPeriods.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    managerId: text("manager_id").notNull(), // userId penyusun
    status: text("status").default("draft").notNull(),
    revisionNote: text("revision_note"),
    agreedAt: timestamp("agreed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.periodId, t.employeeId)],
)

// Epic (= Dimension): tingkat atas, bobot Σ per scorecard = 100%.
export const kpiEpics = pgTable("kpi_epics", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  scorecardId: text("scorecard_id")
    .notNull()
    .references(() => kpiScorecards.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  weight: integer("weight").notNull(), // %, Σ per scorecard = 100
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})

// Task (= KPI): di bawah epic, bobot Σ per epic = 100% + rubrik 1–5.
export const kpiTasks = pgTable("kpi_tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  epicId: text("epic_id")
    .notNull()
    .references(() => kpiEpics.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  weight: integer("weight").notNull(), // %, Σ per epic = 100
  targetNote: text("target_note"), // "Notes on KPI Target"
  rubric: jsonb("rubric").$type<RubricLevel[]>().notNull(), // 5 entri (target=3)
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})

// Sub-task: opsional, dibuat karyawan saat eksekusi (tanpa bobot/skor).
export const kpiSubtasks = pgTable("kpi_subtasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  taskId: text("task_id")
    .notNull()
    .references(() => kpiTasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  isDone: boolean("is_done").default(false).notNull(),
  createdById: text("created_by_id").notNull(), // userId (karyawan)
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})

// Fase B — update progres per task (historis) + bukti.
export const kpiProgress = pgTable("kpi_progress", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  taskId: text("task_id")
    .notNull()
    .references(() => kpiTasks.id, { onDelete: "cascade" }),
  percent: integer("percent").notNull(), // 0–100
  note: text("note"),
  evidencePath: text("evidence_path"),
  evidenceName: text("evidence_name"),
  createdById: text("created_by_id").notNull(), // userId
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})

// Fase B — feedback manajer saat monitoring (per task).
export const kpiFeedback = pgTable("kpi_feedback", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  taskId: text("task_id")
    .notNull()
    .references(() => kpiTasks.id, { onDelete: "cascade" }),
  fromUserId: text("from_user_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})

// Fase C — penilaian akhir per task (realization + self/manager/final + kalibrasi).
export const kpiAppraisals = pgTable(
  "kpi_appraisals",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    taskId: text("task_id")
      .notNull()
      .references(() => kpiTasks.id, { onDelete: "cascade" }),
    realization: text("realization"), // teks capaian (karyawan)
    selfScore: integer("self_score"), // 1–5 (SE)
    selfNote: text("self_note"),
    managerScore: integer("manager_score"), // 1–5 (manajer)
    managerNote: text("manager_note"),
    finalScore: integer("final_score"), // 1–5; default = managerScore; override HR
    notesOnAchievement: text("notes_on_achievement"),
    calibratedById: text("calibrated_by_id"), // userId HR
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.taskId)],
)
