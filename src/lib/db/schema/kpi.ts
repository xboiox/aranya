import { pgTable, text, timestamp, integer, unique } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { employees } from "./employees"
import { users } from "./auth"

export const KPI_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const

export const kpiEvaluations = pgTable(
  "kpi_evaluations",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    period: text("period").notNull(), // mis. "2026-Q1"
    score: integer("score").notNull(), // 0–100
    notes: text("notes"),
    status: text("status").default("pending").notNull(),
    approverId: text("approver_id").references(() => users.id),
    decidedAt: timestamp("decided_at", { mode: "date" }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.employeeId, t.period)],
)
