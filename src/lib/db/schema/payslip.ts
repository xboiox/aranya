import { pgTable, text, timestamp, integer, unique } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { employees } from "./employees"
import { users } from "./auth"

export const payslips = pgTable(
  "payslips",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1–12
    fileName: text("file_name").notNull(),
    storagePath: text("storage_path").notNull(),
    uploadedById: text("uploaded_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.employeeId, t.year, t.month)],
)
