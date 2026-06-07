import { pgTable, text, timestamp, date, integer } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { employees } from "./employees"
import { users } from "./auth"

export const OVERTIME_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
} as const

export const overtimeRequests = pgTable("overtime_requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  date: date("date", { mode: "date" }).notNull(),
  startTime: text("start_time").notNull(), // "HH:MM"
  endTime: text("end_time").notNull(), // "HH:MM"
  durationMinutes: integer("duration_minutes").notNull(),
  reason: text("reason"),
  status: text("status").default("pending").notNull(),
  approverId: text("approver_id").references(() => users.id),
  decidedAt: timestamp("decided_at", { mode: "date" }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})
