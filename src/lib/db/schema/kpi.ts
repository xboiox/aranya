import { pgTable, text, timestamp, integer, date } from "drizzle-orm/pg-core"
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

// Status KPI individual dalam fase perencanaan.
export const KPI_STATUS = {
  DRAFT: "draft",
  PROPOSED: "proposed",
  AGREED: "agreed",
  REVISION_REQUESTED: "revision_requested",
} as const

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

// KPI/indikator per karyawan, ditetapkan manajer langsung.
export const kpis = pgTable("kpis", {
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
  managerId: text("manager_id").notNull(), // userId penetap
  title: text("title").notNull(),
  description: text("description"),
  weight: integer("weight").notNull(), // persen, total/karyawan/periode = 100
  target: text("target"),
  status: text("status").default("draft").notNull(),
  revisionNote: text("revision_note"),
  agreedAt: timestamp("agreed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})

// Fase B — update progres (historis) oleh karyawan.
export const kpiProgress = pgTable("kpi_progress", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  kpiId: text("kpi_id")
    .notNull()
    .references(() => kpis.id, { onDelete: "cascade" }),
  percent: integer("percent").notNull(), // 0–100
  note: text("note"),
  evidencePath: text("evidence_path"),
  evidenceName: text("evidence_name"),
  createdById: text("created_by_id").notNull(), // userId
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})

// Fase B — feedback manajer saat monitoring.
export const kpiFeedback = pgTable("kpi_feedback", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  kpiId: text("kpi_id")
    .notNull()
    .references(() => kpis.id, { onDelete: "cascade" }),
  fromUserId: text("from_user_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})
