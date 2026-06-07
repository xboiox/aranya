import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { employees } from "./employees"

export const CHECKLIST_TYPE = {
  ONBOARDING: "onboarding",
  OFFBOARDING: "offboarding",
} as const

export const onboardingTasks = pgTable("onboarding_tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // onboarding | offboarding
  task: text("task").notNull(),
  isDone: boolean("is_done").default(false).notNull(),
  doneAt: timestamp("done_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})
