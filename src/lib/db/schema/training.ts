import { pgTable, text, timestamp, date } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { employees } from "./employees"

export const TRAINING_TYPE = {
  TRAINING: "training",
  CERTIFICATION: "certification",
} as const

export const TRAINING_STATUS = {
  PLANNED: "planned",
  ONGOING: "ongoing",
  COMPLETED: "completed",
} as const

export const trainingRecords = pgTable("training_records", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull(), // training | certification
  provider: text("provider"),
  startDate: date("start_date", { mode: "date" }),
  completionDate: date("completion_date", { mode: "date" }),
  expiryDate: date("expiry_date", { mode: "date" }), // untuk sertifikasi
  status: text("status").default("planned").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})
