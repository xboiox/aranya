import {
  pgTable,
  text,
  timestamp,
  date,
  integer,
} from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { employees } from "./employees"
import { users } from "./auth"

export const LEAVE_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const

export const leaveRequests = pgTable("leave_requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // annual | sick | permission | maternity | important
  startDate: date("start_date", { mode: "date" }).notNull(),
  endDate: date("end_date", { mode: "date" }).notNull(),
  totalDays: integer("total_days").notNull(),
  reason: text("reason"),
  status: text("status").default("pending").notNull(),
  approverId: text("approver_id").references(() => users.id),
  decidedAt: timestamp("decided_at", { mode: "date" }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})

// Key tenant_config untuk kuota cuti tahunan (default 12)
export const ANNUAL_LEAVE_QUOTA_KEY = "annual_leave_quota"
export const DEFAULT_ANNUAL_QUOTA = 12
